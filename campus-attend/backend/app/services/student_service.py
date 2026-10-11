from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.student import Student
from app.models.academic import Program, Section
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse

def get_paginated_students(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    program_id: Optional[str] = None,
    section_id: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[StudentResponse], int]:
    """Retrieve paginated and filtered students with enriched program and section names."""
    query = db.query(Student)

    if status:
        query = query.filter(Student.status == status)

    if program_id:
        query = query.filter(Student.program_id == program_id)

    if section_id:
        query = query.filter(Student.current_section_id == section_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.student_number.ilike(search_pattern),
                Student.last_name.ilike(search_pattern),
                Student.first_name.ilike(search_pattern),
                Student.email.ilike(search_pattern),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    students = (
        query.order_by(Student.last_name.asc(), Student.first_name.asc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    results = []
    for s in students:
        resp = StudentResponse(
            id=s.id,
            student_number=s.student_number,
            first_name=s.first_name,
            middle_name=s.middle_name,
            last_name=s.last_name,
            suffix=s.suffix,
            email=s.email,
            gender=s.gender,
            program_id=s.program_id,
            year_level=s.year_level,
            current_section_id=s.current_section_id,
            status=s.status,
            created_at=s.created_at,
            program_code=s.program.code if s.program else None,
            section_name=s.current_section.name if s.current_section else None,
        )
        results.append(resp)

    return results, total

def create_student(db: Session, payload: StudentCreate) -> Student:
    """Create a new student with uniqueness and referential integrity checks."""
    existing = db.query(Student).filter(Student.student_number == payload.student_number).first()
    if existing:
        raise ValueError(f"Student with number '{payload.student_number}' already exists.")

    program = db.query(Program).filter(Program.id == payload.program_id).first()
    if not program:
        raise ValueError(f"Program with id '{payload.program_id}' not found.")

    if payload.current_section_id:
        section = db.query(Section).filter(Section.id == payload.current_section_id).first()
        if not section:
            raise ValueError(f"Section with id '{payload.current_section_id}' not found.")

    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

def update_student(db: Session, student_id: str, payload: StudentUpdate) -> Optional[Student]:
    """Update student profile fields."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(student, field, val)

    db.commit()
    db.refresh(student)
    return student

def archive_student(db: Session, student_id: str) -> Optional[Student]:
    """Soft delete/archive student by setting status to inactive."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return None

    student.status = "inactive"
    db.commit()
    db.refresh(student)
    return student
