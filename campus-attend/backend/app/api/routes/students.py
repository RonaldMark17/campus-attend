import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Body, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.student import Student
from app.permissions.guards import get_current_user, require_role
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentPaginationResponse,
    CSVPreviewResponse,
    CSVCommitRequest,
    CSVCommitResponse,
)
from app.services.student_service import (
    get_paginated_students,
    create_student,
    update_student,
    archive_student,
)
from app.services.csv_importer import (
    parse_and_validate_student_csv,
    commit_validated_student_csv,
)

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("", response_model=StudentPaginationResponse)
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    program_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List students with search, filters, and server-side pagination."""
    items, total = get_paginated_students(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        program_id=program_id,
        section_id=section_id,
        status=status,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return StudentPaginationResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def add_student(
    payload: StudentCreate,
    current_user: User = Depends(require_role("admin", "registrar")),
    db: Session = Depends(get_db),
):
    """Add an individual student profile."""
    try:
        student = create_student(db, payload)
        return student
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve an individual student's details."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student

@router.put("/{student_id}", response_model=StudentResponse)
def modify_student(
    student_id: str,
    payload: StudentUpdate,
    current_user: User = Depends(require_role("admin", "registrar")),
    db: Session = Depends(get_db),
):
    """Update student profile details."""
    student = update_student(db, student_id, payload)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student

@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    current_user: User = Depends(require_role("admin", "registrar")),
    db: Session = Depends(get_db),
):
    """Soft-delete / archive a student record."""
    student = archive_student(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return {"message": f"Student '{student.student_number}' archived successfully."}

@router.post("/import/preview", response_model=CSVPreviewResponse)
async def preview_csv_import(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("admin", "registrar")),
    db: Session = Depends(get_db),
):
    """
    Dry-run preview of a CSV student roster.
    Validates formatting, required headers, duplicates, and database foreign keys without committing.
    """
    content = await file.read()
    try:
        decoded_content = content.decode("utf-8-sig") # Handle UTF-8 with BOM cleanly
    except UnicodeDecodeError:
        decoded_content = content.decode("latin-1")

    try:
        preview = parse_and_validate_student_csv(db, decoded_content)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/import/commit", response_model=CSVCommitResponse)
def commit_csv_import(
    payload: CSVCommitRequest,
    current_user: User = Depends(require_role("admin", "registrar")),
    db: Session = Depends(get_db),
):
    """
    Commit validated CSV rows from a previous preview in an atomic transaction.
    """
    try:
        result = commit_validated_student_csv(db, payload.rows)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
