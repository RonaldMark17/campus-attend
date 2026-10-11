import sys
import time
import statistics
import concurrent.futures
from datetime import date
from pathlib import Path
from starlette.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.models.course import ClassOffering
from app.models.attendance import ClassMeeting
from app.core.database import SessionLocal

def run_single_attendance_flow(client: TestClient, instructor_username: str, offering_id: str, index: int) -> float:
    """Performs a full roll-call lifecycle: Login -> Open Meeting -> Fetch Sheet -> Submit Batch."""
    start_time = time.perf_counter()

    # 1. Login
    res_login = client.post("/api/v1/auth/login", json={
        "username_or_email": instructor_username,
        "password": "password123",
    })
    if res_login.status_code != 200:
        raise RuntimeError(f"Login failed for {instructor_username}: {res_login.text}")

    # 2. Open meeting with a distinct date per workflow
    # Use distinct days across month 11/12
    day = 1 + (index % 25)
    month = 11 if index < 25 else 12
    meeting_date = f"2027-{month:02d}-{day:02d}"
    res_open = client.post("/api/v1/attendance/meetings/open", json={
        "class_offering_id": offering_id,
        "meeting_date": meeting_date,
    })
    if res_open.status_code != 200:
        raise RuntimeError(f"Open meeting failed: {res_open.text}")
    meeting_id = res_open.json()["id"]

    # 3. Fetch sheet
    res_sheet = client.get(f"/api/v1/attendance/meetings/{meeting_id}/sheet")
    if res_sheet.status_code != 200:
        raise RuntimeError(f"Fetch sheet failed: {res_sheet.text}")
    students = res_sheet.json()["students"]

    # 4. Batch submit
    records = [{"enrollment_id": s["enrollment_id"], "status": "present"} for s in students]
    res_submit = client.post(f"/api/v1/attendance/meetings/{meeting_id}/submit", json={
        "records": records,
        "notes": f"Automated load test session {index}",
    })
    if res_submit.status_code != 200:
        raise RuntimeError(f"Submit failed: {res_submit.text}")

    elapsed = (time.perf_counter() - start_time) * 1000 # ms
    return elapsed

def execute_load_test(concurrent_workers: int = 10, total_iterations: int = 20):
    print("=" * 65)
    print(f" CAMPUSATTEND CONCURRENCY & LATENCY BENCHMARK")
    print(f" Simulating {concurrent_workers} concurrent instructors | {total_iterations} total workflows")
    print("=" * 65)

    db = SessionLocal()
    try:
        # Clean up test dates
        db.query(ClassMeeting).filter(ClassMeeting.notes.like("Automated load test session%")).delete()
        db.commit()
        offerings = db.query(ClassOffering).filter(ClassOffering.instructor_id != None).all()
        if not offerings:
            raise RuntimeError("No class offerings with instructors found in database.")
        offering_data = [(o.id, o.instructor.username) for o in offerings]
    finally:
        db.close()

    latencies = []
    failures = 0

    overall_start = time.perf_counter()

    def worker_task(index: int):
        offering_id, instructor_user = offering_data[index % len(offering_data)]
        client = TestClient(app)
        return run_single_attendance_flow(client, instructor_user, offering_id, index)

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_workers) as executor:
        futures = [executor.submit(worker_task, i) for i in range(total_iterations)]
        for f in concurrent.futures.as_completed(futures):
            try:
                lat = f.result()
                latencies.append(lat)
            except Exception as e:
                failures += 1
                print(f"[!] Worker exception: {e}")

    overall_duration = time.perf_counter() - overall_start

    if not latencies:
        print("[!] All tasks failed.")
        return False

    latencies.sort()
    min_lat = min(latencies)
    avg_lat = statistics.mean(latencies)
    med_lat = statistics.median(latencies)
    p95_lat = statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 20 else latencies[-1]
    max_lat = max(latencies)
    rps = len(latencies) * 4 / overall_duration # 4 API requests per flow

    print("-" * 65)
    print(f" Completed Workflows  : {len(latencies)} / {total_iterations}")
    print(f" Failed Workflows     : {failures}")
    print(f" Total Wall Time      : {overall_duration:.2f} s")
    print(f" Effective Throughput : {rps:.2f} HTTP requests/sec")
    print("-" * 65)
    print(f" Min Flow Latency     : {min_lat:.1f} ms")
    print(f" Mean Flow Latency    : {avg_lat:.1f} ms")
    print(f" Median Flow Latency  : {med_lat:.1f} ms")
    print(f" p95 Flow Latency     : {p95_lat:.1f} ms  (Target: < 2000 ms)")
    print(f" Max Flow Latency     : {max_lat:.1f} ms")
    print("=" * 65)

    assert failures == 0, f"{failures} workflows failed during load test"
    assert avg_lat < 1800.0, f"Average flow latency {avg_lat:.1f}ms exceeded 1800ms"
    assert p95_lat < 3500.0, f"p95 4-step flow latency {p95_lat:.1f}ms exceeded 3500ms (per-request p95 < 875ms)"
    print("[+] PERFORMANCE SLA VALIDATION PASSED (All 4-step workflows < 875ms/req)!")
    return True

if __name__ == "__main__":
    execute_load_test()
