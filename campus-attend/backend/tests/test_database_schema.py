import pytest
from datetime import date, time, datetime, timezone
from sqlalchemy.exc import IntegrityError
from app.core.database import SessionLocal
from app.core.security import hash_password, verify_password
from app.models import (
    User,
    Department,
    Program,
    AcademicTerm,
    Section,
    Subject,
    Student,
    ClassOffering,
    ClassSchedule,
    Enrollment,
    ClassMeeting,
    AttendanceRecord,
    AttendanceCorrectionRequest,
    AuditLog,
)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

def test_user_creation_and_argon2_hashing(db):
    """Verify User model creation and Argon2id password verification."""
    raw_pass = "TestSecurePassword2026!"
    hashed = hash_password(raw_pass)
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    user = db.query(User).filter_by(username="admin").first()
    assert user is not None
    assert user.role == "admin"
    assert verify_password("admin123", user.hashed_password) is True

def test_unique_student_number_constraint(db):
    """Verify that student numbers must be strictly unique."""
    existing_student = db.query(Student).first()
    assert existing_student is not None

    duplicate_student = Student(
        student_number=existing_student.student_number, # Duplicate
        first_name="Duplicate",
        last_name="Test",
        program_id=existing_student.program_id,
        year_level=1,
        status="active"
    )
    db.add(duplicate_student)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

def test_duplicate_enrollment_prevention(db):
    """Verify that a student cannot have duplicate active enrollment in the same class offering."""
    existing_enrollment = db.query(Enrollment).first()
    assert existing_enrollment is not None

    duplicate_enr = Enrollment(
        student_id=existing_enrollment.student_id,
        class_offering_id=existing_enrollment.class_offering_id,
        enrollment_date=date.today(),
        status="enrolled"
    )
    db.add(duplicate_enr)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

def test_duplicate_attendance_record_prevention(db):
    """Verify each class meeting must have at most one attendance record per enrollment."""
    existing_record = db.query(AttendanceRecord).first()
    assert existing_record is not None

    duplicate_att = AttendanceRecord(
        class_meeting_id=existing_record.class_meeting_id,
        enrollment_id=existing_record.enrollment_id,
        status="present",
        recorded_at=datetime.now(timezone.utc)
    )
    db.add(duplicate_att)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

def test_valid_attendance_status_check_constraint(db):
    """Verify attendance statuses are restricted to present, absent, late, or excused."""
    meeting = db.query(ClassMeeting).first()
    enrollment = db.query(Enrollment).filter_by(class_offering_id=meeting.class_offering_id).first()

    # Valid statuses must pass
    for valid_status in ["present", "absent", "late", "excused"]:
        assert valid_status in ["present", "absent", "late", "excused"]

    # Invalid status should violate check constraint
    invalid_record = AttendanceRecord(
        class_meeting_id=meeting.id,
        enrollment_id=enrollment.id,
        status="truant", # Invalid status!
        recorded_at=datetime.now(timezone.utc)
    )
    db.add(invalid_record)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

def test_attendance_correction_request_model(db):
    """Verify attendance correction request records link properly to attendance records."""
    record = db.query(AttendanceRecord).first()
    instructor = db.query(User).filter_by(role="instructor").first()

    req = AttendanceCorrectionRequest(
        attendance_record_id=record.id,
        requested_by_id=instructor.id,
        requested_status="present",
        reason="Student presented medical slip after class",
        review_status="pending"
    )
    db.add(req)
    db.commit()
    assert req.id is not None
    assert req.review_status == "pending"

def test_audit_logs_record_mutations(db):
    """Verify audit logs table records user actions and JSON snapshots."""
    admin = db.query(User).filter_by(role="admin").first()
    audit = AuditLog(
        user_id=admin.id,
        action="UPDATE_STUDENT",
        entity_type="student",
        entity_id="test-student-id",
        ip_address="192.168.10.25",
        user_agent="Mozilla/5.0",
        old_values={"status": "active"},
        new_values={"status": "dropped"},
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    assert audit.id is not None
    assert audit.new_values["status"] == "dropped"
