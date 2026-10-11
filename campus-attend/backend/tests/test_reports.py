import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.models.course import ClassOffering
from app.models.student import Student
from app.models.attendance import ClassMeeting
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

def test_daily_report_and_csv_export(client, db):
    """Verify daily attendance report generation and CSV download."""
    login_as(client, "admin", "admin123")
    offering = db.query(ClassOffering).first()
    assert offering is not None

    # Fetch daily report
    res = client.get(f"/api/v1/reports/daily?offering_id={offering.id}&meeting_date=2026-10-12")
    assert res.status_code == 200
    data = res.json()
    assert "attendance_rate" in data
    assert "records" in data
    assert data["subject_code"] == offering.subject.code

    # Download daily CSV
    csv_res = client.get(f"/api/v1/reports/daily/csv?offering_id={offering.id}&meeting_date=2026-10-12")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "CAMPUSATTEND - DAILY ATTENDANCE REPORT" in csv_res.text
    assert "Student Number" in csv_res.text

def test_offering_aggregated_report_csv_and_pdf(client, db):
    """Verify semester aggregated metrics, CSV export, and PDF binary output."""
    login_as(client, "depthead", "password123")
    offering = db.query(ClassOffering).first()
    assert offering is not None

    # 1. JSON report
    res = client.get(f"/api/v1/reports/offering/{offering.id}")
    assert res.status_code == 200
    data = res.json()
    assert "average_attendance_rate" in data
    assert "students" in data
    assert len(data["students"]) > 0

    # 2. CSV export
    csv_res = client.get(f"/api/v1/reports/offering/{offering.id}/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "CAMPUSATTEND - CLASS OFFERING ATTENDANCE SUMMARY" in csv_res.text

    # 3. PDF generation
    pdf_res = client.get(f"/api/v1/reports/offering/{offering.id}/pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert pdf_res.content.startswith(b"%PDF-")
    assert len(pdf_res.content) > 1000

def test_student_attendance_transcript(client, db):
    """Verify cumulative attendance transcript for an individual student."""
    login_as(client, "admin", "admin123")
    student = db.query(Student).first()
    assert student is not None

    res = client.get(f"/api/v1/reports/student/{student.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["student_number"] == student.student_number
    assert "overall_attendance_rate" in data
    assert "subject_summaries" in data

def test_incomplete_attendance_report(client, db):
    """Verify tracking of meetings with draft status or unmarked rosters."""
    login_as(client, "admin", "admin123")
    res = client.get("/api/v1/reports/incomplete")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
