from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.academic import AcademicTerm, Department, Program, Subject, Section
from app.models.course import ClassOffering, ClassSchedule, Enrollment
from app.permissions.guards import get_current_user, require_role
from app.schemas.academic import (
    AcademicTermResponse,
    AcademicTermCreate,
    DepartmentResponse,
    ProgramResponse,
    SubjectResponse,
    SectionResponse,
    ClassOfferingCreate,
    ClassOfferingResponse,
    ClassScheduleCreate,
    ClassScheduleResponse,
    EnrollmentCreate,
    EnrollmentResponse,
    ScheduleConflictCheck,
    ScheduleConflictResult,
)
from app.services.academic_service import (
    check_schedule_conflict,
    get_class_offerings_enriched,
    enroll_student_in_offering,
)

router = APIRouter(prefix="/academics", tags=["Academics & Classes"])

# --- Academic Terms ---
@router.get("/terms", response_model=List[AcademicTermResponse])
def list_academic_terms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all academic terms."""
    return db.query(AcademicTerm).order_by(AcademicTerm.start_date.desc()).all()

@router.post("/terms", response_model=AcademicTermResponse, status_code=status.HTTP_201_CREATED)
def create_academic_term(
    payload: AcademicTermCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a new academic term."""
    existing = db.query(AcademicTerm).filter(AcademicTerm.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Term code '{payload.code}' already exists.")

    term = AcademicTerm(**payload.model_dump())
    db.add(term)
    db.commit()
    db.refresh(term)
    return term

# --- Reference Lists ---
@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Department).filter(Department.is_active == True).all()

@router.get("/programs", response_model=List[ProgramResponse])
def list_programs(
    department_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Program).filter(Program.is_active == True)
    if department_id:
        query = query.filter(Program.department_id == department_id)
    return query.all()

@router.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(
    department_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Subject).filter(Subject.is_active == True)
    if department_id:
        query = query.filter(Subject.department_id == department_id)
    return query.all()

@router.get("/sections", response_model=List[SectionResponse])
def list_sections(
    program_id: Optional[str] = None,
    term_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Section)
    if program_id:
        query = query.filter(Section.program_id == program_id)
    if term_id:
        query = query.filter(Section.academic_term_id == term_id)
    return query.all()

# --- Class Offerings & Schedules ---
@router.get("/offerings", response_model=List[ClassOfferingResponse])
def list_offerings(
    term_id: Optional[str] = Query(None),
    instructor_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List enriched class offerings with instructor names, schedule slots, and enrolled counts."""
    # Instructors only view their assigned offerings unless admin or dept_head
    effective_instructor_id = instructor_id
    if current_user.role == "instructor":
        effective_instructor_id = current_user.id

    return get_class_offerings_enriched(
        db=db,
        term_id=term_id,
        instructor_id=effective_instructor_id,
        section_id=section_id,
    )

@router.post("/offerings", response_model=ClassOfferingResponse, status_code=status.HTTP_201_CREATED)
def create_offering(
    payload: ClassOfferingCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a new class offering with optional schedules."""
    offering = ClassOffering(
        academic_term_id=payload.academic_term_id,
        subject_id=payload.subject_id,
        section_id=payload.section_id,
        instructor_id=payload.instructor_id,
        room=payload.room,
        status="active",
    )
    db.add(offering)
    db.flush()

    if payload.schedules:
        for sched in payload.schedules:
            conflict = check_schedule_conflict(
                db=db,
                day_of_week=sched.day_of_week,
                start_time=sched.start_time,
                end_time=sched.end_time,
                instructor_id=payload.instructor_id,
                section_id=payload.section_id,
                room=sched.room or payload.room,
            )
            if conflict.has_conflict:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict.message)

            db.add(
                ClassSchedule(
                    class_offering_id=offering.id,
                    day_of_week=sched.day_of_week,
                    start_time=sched.start_time,
                    end_time=sched.end_time,
                    room=sched.room or payload.room,
                )
            )

    db.commit()
    db.refresh(offering)
    return get_class_offerings_enriched(db, term_id=offering.academic_term_id)[0]

@router.post("/schedules/check-conflict", response_model=ScheduleConflictResult)
def check_schedule_conflict_endpoint(
    payload: ScheduleConflictCheck,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Validate schedule slot conflicts before committing."""
    return check_schedule_conflict(
        db=db,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        instructor_id=payload.instructor_id,
        section_id=payload.section_id,
        room=payload.room,
        current_offering_id=payload.offering_id,
    )

# --- Class Enrollment ---
@router.post("/offerings/{offering_id}/enroll", response_model=EnrollmentResponse)
def enroll_student(
    offering_id: str,
    payload: EnrollmentCreate,
    current_user: User = Depends(require_role("admin", "registrar")),
    db: Session = Depends(get_db),
):
    """Enroll a student into a class offering."""
    try:
        enr = enroll_student_in_offering(db, offering_id, payload.student_id)
        return EnrollmentResponse(
            id=enr.id,
            student_id=enr.student_id,
            class_offering_id=enr.class_offering_id,
            enrollment_date=enr.enrollment_date,
            status=enr.status,
            student_number=enr.student.student_number if enr.student else None,
            student_name=enr.student.full_name if enr.student else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/offerings/{offering_id}/enroll/{student_id}")
def drop_enrollment(
    offering_id: str,
    student_id: str,
    current_user: User = Depends(require_role("admin", "registrar")),
    db: Session = Depends(get_db),
):
    """Mark a student's enrollment in an offering as dropped."""
    enr = (
        db.query(Enrollment)
        .filter(
            Enrollment.class_offering_id == offering_id,
            Enrollment.student_id == student_id,
        )
        .first()
    )
    if not enr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment record not found.")

    enr.status = "dropped"
    db.commit()
    return {"message": "Enrollment status changed to dropped."}
