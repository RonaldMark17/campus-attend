import pytest
from datetime import time
from fastapi.testclient import TestClient
from app.main import app
from app.models.course import ClassOffering, Enrollment
from app.models.student import Student
from app.models.user import User
from app.core.database import SessionLocal

@pytest.fixture
def client():
    client = TestClient(app)
    # Log in as admin
    client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "admin123"},
    )
    return client

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_list_academics_reference_data(client):
    """Verify listing departments, programs, subjects, and terms."""
    terms_res = client.get("/api/v1/academics/terms")
    assert terms_res.status_code == 200
    assert len(terms_res.json()) >= 1

    depts_res = client.get("/api/v1/academics/departments")
    assert depts_res.status_code == 200
    assert len(depts_res.json()) >= 2

    progs_res = client.get("/api/v1/academics/programs")
    assert progs_res.status_code == 200
    assert len(progs_res.json()) >= 2

    offerings_res = client.get("/api/v1/academics/offerings")
    assert offerings_res.status_code == 200
    assert len(offerings_res.json()) >= 3

def test_schedule_conflict_detection(client, db):
    """Verify detector catches overlapping timetable slots for room, instructor, and section."""
    # offering1 in seed data: MWF (1, 3, 5) from 09:00 to 10:00 in "ComLab 101" with instructor1 and sec_bscs_1a
    offering1 = db.query(ClassOffering).first()
    assert offering1 is not None

    # Test Instructor Conflict: Same instructor, Monday (day 1) 09:30 to 10:30 (overlaps with 09:00 - 10:00)
    conflict_payload = {
        "instructor_id": offering1.instructor_id,
        "room": "Another Room 999",
        "section_id": "different-section-id",
        "day_of_week": 1,
        "start_time": "09:30:00",
        "end_time": "10:30:00",
    }
    res = client.post("/api/v1/academics/schedules/check-conflict", json=conflict_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["has_conflict"] is True
    assert data["conflict_type"] == "instructor"

    # Test Room Conflict: Different instructor, but same room "ComLab 101", Monday 09:15 to 09:45
    other_instructor = db.query(User).filter_by(username="instructor2").first()
    room_conflict_payload = {
        "instructor_id": other_instructor.id,
        "room": "ComLab 101", # Occupied!
        "section_id": "different-section-id",
        "day_of_week": 1,
        "start_time": "09:15:00",
        "end_time": "09:45:00",
    }
    room_res = client.post("/api/v1/academics/schedules/check-conflict", json=room_conflict_payload)
    assert room_res.status_code == 200
    assert room_res.json()["has_conflict"] is True
    assert room_res.json()["conflict_type"] == "room"

    # Test No Conflict: Tuesday (day 2) 08:00 to 09:00
    no_conflict_payload = {
        "instructor_id": offering1.instructor_id,
        "room": "ComLab 101",
        "section_id": offering1.section_id,
        "day_of_week": 2,
        "start_time": "08:00:00",
        "end_time": "09:00:00",
    }
    ok_res = client.post("/api/v1/academics/schedules/check-conflict", json=no_conflict_payload)
    assert ok_res.status_code == 200
    assert ok_res.json()["has_conflict"] is False

def test_class_enrollment_and_duplicate_prevention(client, db):
    """Verify enrolling a student into a class offering and preventing duplicate active enrollment."""
    offering = db.query(ClassOffering).first()
    # Find a student who is not yet enrolled in offering
    enrolled_ids = {e.student_id for e in offering.enrollments}
    candidate_student = db.query(Student).filter(~Student.id.in_(enrolled_ids)).first()
    assert candidate_student is not None

    # Enroll
    enroll_res = client.post(
        f"/api/v1/academics/offerings/{offering.id}/enroll",
        json={"student_id": candidate_student.id},
    )
    assert enroll_res.status_code == 200
    assert enroll_res.json()["student_id"] == candidate_student.id

    # Duplicate enrollment attempt must fail with 400 Bad Request
    dup_res = client.post(
        f"/api/v1/academics/offerings/{offering.id}/enroll",
        json={"student_id": candidate_student.id},
    )
    assert dup_res.status_code == 400
    assert "already enrolled" in dup_res.json()["detail"]
