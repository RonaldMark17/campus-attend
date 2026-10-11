import pytest
from datetime import date, datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.models.course import ClassOffering, Enrollment
from app.models.attendance import ClassMeeting, AttendanceRecord, AttendanceCorrectionRequest
from app.models.user import User
from app.core.database import SessionLocal

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def login_as(client, username, password):
    res = client.post("/api/v1/auth/login", json={"username_or_email": username, "password": password})
    assert res.status_code == 200

def test_open_meeting_session_and_instructor_isolation(client, db):
    """Verify instructor can open their assigned meeting, but cannot access another instructor's class."""
    offering = db.query(ClassOffering).filter(ClassOffering.instructor_id != None).first()
    assert offering is not None
    instructor = offering.instructor

    # Login as assigned instructor
    login_as(client, instructor.username, "password123")

    # Open meeting for today
    payload = {
        "class_offering_id": offering.id,
        "meeting_date": str(date.today()),
        "notes": "Testing attendance session",
    }
    res = client.post("/api/v1/attendance/meetings/open", json=payload)
    assert res.status_code == 200
    meeting_data = res.json()
    assert meeting_data["status"] == "draft"
    assert meeting_data["class_offering_id"] == offering.id

    # Login as a different instructor (instructor2)
    other_instructor = db.query(User).filter(User.role == "instructor", User.id != instructor.id).first()
    assert other_instructor is not None
    login_as(client, other_instructor.username, "password123")

    # Attempt to open meeting for another instructor's class -> Must return 403 Forbidden
    other_res = client.post("/api/v1/attendance/meetings/open", json=payload)
    assert other_res.status_code == 403
    assert "not assigned" in other_res.json()["detail"].lower()

def test_get_sheet_and_submit_attendance(client, db):
    """Verify loading student roster sheet, submitting attendance batch, and transitioning to submitted."""
    offering = db.query(ClassOffering).first()
    instructor = offering.instructor

    # Ensure clean meeting for test date
    db.query(ClassMeeting).filter_by(class_offering_id=offering.id, meeting_date=date(2026, 11, 10)).delete()
    db.commit()

    login_as(client, instructor.username, "password123")

    # Open meeting
    meeting_res = client.post("/api/v1/attendance/meetings/open", json={
        "class_offering_id": offering.id,
        "meeting_date": "2026-11-10",
    })
    assert meeting_res.status_code == 200
    meeting_id = meeting_res.json()["id"]

    # Get sheet
    sheet_res = client.get(f"/api/v1/attendance/meetings/{meeting_id}/sheet")
    assert sheet_res.status_code == 200
    sheet = sheet_res.json()
    assert len(sheet["students"]) > 0
    assert sheet["can_edit"] is True

    # Prepare batch records: mark 1st student late, others present
    records = []
    for idx, s in enumerate(sheet["students"]):
        status_val = "late" if idx == 0 else "present"
        records.append({
            "enrollment_id": s["enrollment_id"],
            "status": status_val,
            "remarks": "Traffic delay" if idx == 0 else None,
        })

    # Submit attendance
    submit_res = client.post(f"/api/v1/attendance/meetings/{meeting_id}/submit", json={
        "records": records,
        "notes": "Regular class session held."
    })
    assert submit_res.status_code == 200
    data = submit_res.json()
    assert data["status"] == "submitted"
    assert data["submitted_count"] == len(records)

    # Subsequent submission attempt should be blocked
    block_res = client.post(f"/api/v1/attendance/meetings/{meeting_id}/submit", json={
        "records": records,
    })
    assert block_res.status_code == 400
    assert "already been submitted" in block_res.json()["detail"]

def test_duplicate_enrollment_id_in_submission_rejected(client, db):
    """Verify backend rejects submissions containing duplicate enrollment IDs."""
    offering = db.query(ClassOffering).first()
    instructor = offering.instructor

    db.query(ClassMeeting).filter_by(class_offering_id=offering.id, meeting_date=date(2026, 11, 12)).delete()
    db.commit()

    login_as(client, instructor.username, "password123")

    meeting_res = client.post("/api/v1/attendance/meetings/open", json={
        "class_offering_id": offering.id,
        "meeting_date": "2026-11-12",
    })
    meeting_id = meeting_res.json()["id"]

    sheet_res = client.get(f"/api/v1/attendance/meetings/{meeting_id}/sheet")
    enr_id = sheet_res.json()["students"][0]["enrollment_id"]

    duplicate_payload = {
        "records": [
            {"enrollment_id": enr_id, "status": "present"},
            {"enrollment_id": enr_id, "status": "late"}, # Duplicate enrollment ID!
        ]
    }
    res = client.post(f"/api/v1/attendance/meetings/{meeting_id}/submit", json=duplicate_payload)
    assert res.status_code == 400
    assert "Duplicate" in res.json()["detail"]

def test_attendance_correction_request_and_approval(client, db):
    """Verify instructor can request a correction on a submitted session and Dept Head can approve it."""
    # Find a submitted record with status 'absent', or create one idempotently
    record = (
        db.query(AttendanceRecord)
        .join(ClassMeeting, AttendanceRecord.class_meeting_id == ClassMeeting.id)
        .filter(ClassMeeting.status == "submitted", AttendanceRecord.status == "absent")
        .first()
    )
    if not record:
        offering = db.query(ClassOffering).filter(ClassOffering.instructor_id != None).first()
        enrollment = db.query(Enrollment).filter_by(class_offering_id=offering.id).first()
        meeting = ClassMeeting(
            class_offering_id=offering.id,
            meeting_date=date(2026, 11, 15),
            status="submitted",
        )
        db.add(meeting)
        db.flush()
        record = AttendanceRecord(
            class_meeting_id=meeting.id,
            enrollment_id=enrollment.id,
            status="absent",
            recorded_by_id=offering.instructor_id,
            recorded_at=datetime.now(timezone.utc),
        )
        db.add(record)
        db.commit()

    assert record is not None
    offering = record.class_meeting.class_offering
    instructor = offering.instructor

    # Ensure clean slate for test record
    db.query(AttendanceCorrectionRequest).filter_by(attendance_record_id=record.id).delete()
    db.commit()

    # 1. Instructor requests correction from 'absent' to 'excused'
    login_as(client, instructor.username, "password123")
    req_res = client.post("/api/v1/attendance/corrections/request", json={
        "attendance_record_id": record.id,
        "requested_status": "excused",
        "reason": "Student provided approved excuse letter and medical slip.",
    })
    assert req_res.status_code == 201

    # Get requests list
    list_res = client.get("/api/v1/attendance/corrections?status_filter=pending")
    assert list_res.status_code == 200
    req_item = next((r for r in list_res.json() if r["attendance_record_id"] == record.id), None)
    assert req_item is not None
    assert req_item["review_status"] == "pending"

    # 2. Dept Head logs in and approves correction
    login_as(client, "depthead", "password123")
    approve_res = client.put(f"/api/v1/attendance/corrections/{req_item['id']}/review", json={
        "review_status": "approved",
        "review_notes": "Excuse validated by College Clinic.",
    })
    assert approve_res.status_code == 200

    # 3. Verify that the attendance record in database was updated to 'excused'
    db.expire_all()
    updated_rec = db.query(AttendanceRecord).filter_by(id=record.id).first()
    assert updated_rec.status == "excused"
