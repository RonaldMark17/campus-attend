import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.student import Student
from app.models.academic import Program
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

def test_list_students_paginated(client):
    """Verify paginated student listing and metadata."""
    res = client.get("/api/v1/students?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 10
    assert data["total"] >= 40
    assert data["total_pages"] >= 4

def test_search_students(client):
    """Verify keyword search across student numbers and names."""
    res = client.get("/api/v1/students?search=2026-10001")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["student_number"] == "2026-10001"

def test_create_and_archive_student(client, db):
    """Verify adding a student and soft-deleting/archiving them."""
    program = db.query(Program).filter_by(code="BSCS").first()
    assert program is not None

    unique_num = f"2026-{uuid.uuid4().hex[:5]}"
    payload = {
        "student_number": unique_num,
        "first_name": "TestFirst",
        "last_name": "TestLast",
        "email": f"{unique_num}@student.school.lan",
        "program_id": program.id,
        "year_level": 1,
        "status": "active"
    }

    # Create
    create_res = client.post("/api/v1/students", json=payload)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Archive / Delete
    del_res = client.delete(f"/api/v1/students/{created_id}")
    assert del_res.status_code == 200

    # Verify status changed to inactive
    get_res = client.get(f"/api/v1/students/{created_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "inactive"

def test_csv_import_preview_and_validation(client):
    """Verify CSV import preview catches missing fields, duplicate student numbers, and invalid programs."""
    u1 = f"2026-{uuid.uuid4().hex[:5]}"
    csv_data = (
        "student_number,first_name,last_name,program_code,year_level,email\n"
        f"{u1},John,Doe,BSCS,1,john.doe@school.lan\n"
        "2026-X1,Jane,Smith,INVALID_PROG,2,jane.smith@school.lan\n"
        f"{u1},Duplicate,Entry,BSCS,1,dup@school.lan\n"
        ",Missing,Number,BSCS,1,no.num@school.lan\n"
    )

    files = {"file": ("test_roster.csv", csv_data.encode("utf-8"), "text/csv")}
    res = client.post("/api/v1/students/import/preview", files=files)
    assert res.status_code == 200
    preview = res.json()

    assert preview["total_rows"] == 4
    assert preview["valid_rows_count"] == 1
    assert preview["invalid_rows_count"] == 3

    # Check specific errors
    row2 = preview["rows"][1]
    assert any("INVALID_PROG" in err for err in row2["errors"])

    row3 = preview["rows"][2]
    assert any("Duplicate" in err for err in row3["errors"])

    row4 = preview["rows"][3]
    assert any("required" in err for err in row4["errors"])

def test_csv_commit_imports_valid_records(client, db):
    """Verify committing validated rows inserts them into the database."""
    u1 = f"2026-{uuid.uuid4().hex[:5]}"
    u2 = f"2026-{uuid.uuid4().hex[:5]}"
    valid_rows = [
        {
            "row_number": 1,
            "student_number": u1,
            "first_name": "Alice",
            "last_name": "Walker",
            "program_code": "BSCS",
            "year_level": 1,
            "is_valid": True,
            "errors": [],
        },
        {
            "row_number": 2,
            "student_number": u2,
            "first_name": "Bob",
            "last_name": "Taylor",
            "program_code": "BSIT",
            "year_level": 1,
            "is_valid": True,
            "errors": [],
        }
    ]

    commit_res = client.post("/api/v1/students/import/commit", json={"rows": valid_rows})
    assert commit_res.status_code == 200
    data = commit_res.json()
    assert data["imported_count"] == 2

    # Verify presence in database
    s1 = db.query(Student).filter_by(student_number=u1).first()
    assert s1 is not None
    assert s1.first_name == "Alice"
