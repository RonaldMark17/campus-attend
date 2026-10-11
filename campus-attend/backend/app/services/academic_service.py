from datetime import time, date
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.course import ClassOffering, ClassSchedule, Enrollment
from app.models.academic import AcademicTerm, Section, Subject
from app.models.student import Student
from app.schemas.academic import (
    ClassScheduleCreate,
    ClassOfferingCreate,
    ClassOfferingResponse,
    ClassScheduleResponse,
    ScheduleConflictResult,
)

def check_schedule_conflict(
    db: Session,
    day_of_week: int,
    start_time: time,
    end_time: time,
    instructor_id: str,
    section_id: str,
    room: Optional[str] = None,
    current_offering_id: Optional[str] = None,
) -> ScheduleConflictResult:
    """
    Check if a schedule slot causes an instructor, room, or section collision.
    Two time slots [S1, E1] and [S2, E2] overlap if: S1 < E2 and E1 > S2.
    """
    # Base query for schedules on the same day of week
    query = (
        db.query(ClassSchedule)
        .join(ClassOffering, ClassSchedule.class_offering_id == ClassOffering.id)
        .filter(ClassSchedule.day_of_week == day_of_week)
        .filter(ClassOffering.status == "active")
        .filter(ClassSchedule.start_time < end_time)
        .filter(ClassSchedule.end_time > start_time)
    )

    if current_offering_id:
        query = query.filter(ClassSchedule.class_offering_id != current_offering_id)

    conflicting_schedules = query.all()

    for sched in conflicting_schedules:
        offering = sched.class_offering

        # 1. Instructor collision
        if offering.instructor_id == instructor_id:
            return ScheduleConflictResult(
                has_conflict=True,
                conflict_type="instructor",
                message=f"Instructor is already scheduled to teach '{offering.subject.code}' from {sched.start_time.strftime('%H:%M')} to {sched.end_time.strftime('%H:%M')}.",
            )

        # 2. Section collision
        if offering.section_id == section_id:
            return ScheduleConflictResult(
                has_conflict=True,
                conflict_type="section",
                message=f"Section '{offering.section.name}' already has class '{offering.subject.code}' from {sched.start_time.strftime('%H:%M')} to {sched.end_time.strftime('%H:%M')}.",
            )

        # 3. Room collision
        if room and sched.room and sched.room.lower().strip() == room.lower().strip():
            return ScheduleConflictResult(
                has_conflict=True,
                conflict_type="room",
                message=f"Room '{room}' is occupied by '{offering.subject.code}' from {sched.start_time.strftime('%H:%M')} to {sched.end_time.strftime('%H:%M')}.",
            )

    return ScheduleConflictResult(has_conflict=False)

def get_class_offerings_enriched(
    db: Session,
    term_id: Optional[str] = None,
    instructor_id: Optional[str] = None,
    section_id: Optional[str] = None,
) -> List[ClassOfferingResponse]:
    """Retrieve class offerings with schedules and student enrollment counts."""
    query = db.query(ClassOffering)

    if term_id:
        query = query.filter(ClassOffering.academic_term_id == term_id)
    if instructor_id:
        query = query.filter(ClassOffering.instructor_id == instructor_id)
    if section_id:
        query = query.filter(ClassOffering.section_id == section_id)

    offerings = query.all()
    results = []

    for off in offerings:
        enrolled_count = len([e for e in off.enrollments if e.status == "enrolled"])
        schedules_resp = [
            ClassScheduleResponse(
                id=s.id,
                class_offering_id=s.class_offering_id,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                room=s.room,
            )
            for s in off.schedules
        ]

        results.append(
            ClassOfferingResponse(
                id=off.id,
                academic_term_id=off.academic_term_id,
                subject_id=off.subject_id,
                section_id=off.section_id,
                instructor_id=off.instructor_id,
                room=off.room,
                status=off.status,
                created_at=off.created_at,
                subject_code=off.subject.code if off.subject else None,
                subject_title=off.subject.title if off.subject else None,
                section_name=off.section.name if off.section else None,
                instructor_name=off.instructor.full_name if off.instructor else None,
                enrolled_count=enrolled_count,
                schedules=schedules_resp,
            )
        )

    return results

def enroll_student_in_offering(
    db: Session,
    offering_id: str,
    student_id: str,
) -> Enrollment:
    """Enroll a student into a class offering with database constraint safeguards."""
    offering = db.query(ClassOffering).filter(ClassOffering.id == offering_id).first()
    if not offering:
        raise ValueError("Class offering not found.")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ValueError("Student not found.")

    existing = (
        db.query(Enrollment)
        .filter(
            Enrollment.class_offering_id == offering_id,
            Enrollment.student_id == student_id,
        )
        .first()
    )

    if existing:
        if existing.status == "enrolled":
            raise ValueError(f"Student '{student.student_number}' is already enrolled in this offering.")
        # Re-activate previously dropped enrollment
        existing.status = "enrolled"
        existing.enrollment_date = date.today()
        db.commit()
        db.refresh(existing)
        return existing

    enrollment = Enrollment(
        student_id=student_id,
        class_offering_id=offering_id,
        enrollment_date=date.today(),
        status="enrolled",
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment
