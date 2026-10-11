import csv
import io
from typing import List, Tuple, Dict
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.academic import Program, Section
from app.schemas.student import CSVRowPreview, CSVPreviewResponse, CSVCommitResponse

REQUIRED_HEADERS = {"student_number", "first_name", "last_name", "program_code"}

def parse_and_validate_student_csv(db: Session, csv_content: str) -> CSVPreviewResponse:
    """
    Dry-run parser validating student CSV rows against syntax and relational constraints.
    Does not write to the database.
    """
    f = io.StringIO(csv_content.strip())
    reader = csv.DictReader(f)

    if not reader.fieldnames:
        raise ValueError("CSV file is empty or missing headers.")

    # Normalize headers to lowercase
    normalized_headers = {h.strip().lower() for h in reader.fieldnames if h}
    missing_headers = REQUIRED_HEADERS - normalized_headers
    if missing_headers:
        raise ValueError(f"Missing required CSV columns: {', '.join(sorted(missing_headers))}")

    # Pre-fetch existing reference data for fast in-memory validation
    existing_student_numbers = {
        s[0] for s in db.query(Student.student_number).all()
    }
    program_map: Dict[str, str] = {
        p.code.upper(): p.id for p in db.query(Program).filter(Program.is_active == True).all()
    }
    section_map: Dict[str, str] = {
        s.name.upper(): s.id for s in db.query(Section).all()
    }

    seen_in_csv = set()
    rows_preview: List[CSVRowPreview] = []
    valid_count = 0
    invalid_count = 0

    for idx, raw_row in enumerate(reader, start=1):
        # Case-insensitive header dictionary
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
        errors = []

        student_number = row.get("student_number", "")
        first_name = row.get("first_name", "")
        last_name = row.get("last_name", "")
        middle_name = row.get("middle_name") or None
        program_code = row.get("program_code", "").upper()
        section_name = row.get("section_name") or None
        email = row.get("email") or None
        gender = row.get("gender") or None

        # Parse year level with safe default
        try:
            year_level = int(row.get("year_level", "1"))
            if year_level < 1 or year_level > 6:
                errors.append("Year level must be between 1 and 6.")
        except ValueError:
            year_level = 1
            errors.append("Year level must be a valid integer.")

        # Required field validations
        if not student_number:
            errors.append("Student number is required.")
        if not first_name:
            errors.append("First name is required.")
        if not last_name:
            errors.append("Last name is required.")
        if not program_code:
            errors.append("Program code is required.")

        # Duplicate in CSV
        if student_number:
            if student_number in seen_in_csv:
                errors.append(f"Duplicate student number '{student_number}' found inside this CSV.")
            seen_in_csv.add(student_number)

            # Duplicate in database
            if student_number in existing_student_numbers:
                errors.append(f"Student number '{student_number}' already registered in the system.")

        # Referential checks
        if program_code and program_code not in program_map:
            errors.append(f"Program code '{program_code}' does not exist in academic records.")

        if section_name and section_name.upper() not in section_map:
            errors.append(f"Section '{section_name}' does not exist.")

        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        rows_preview.append(
            CSVRowPreview(
                row_number=idx,
                student_number=student_number,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                program_code=program_code,
                year_level=year_level,
                section_name=section_name,
                email=email,
                gender=gender,
                is_valid=is_valid,
                errors=errors,
            )
        )

    return CSVPreviewResponse(
        total_rows=len(rows_preview),
        valid_rows_count=valid_count,
        invalid_rows_count=invalid_count,
        rows=rows_preview,
    )

def commit_validated_student_csv(db: Session, valid_rows: List[CSVRowPreview]) -> CSVCommitResponse:
    """
    Commit validated CSV rows into database in an atomic transaction.
    """
    if not valid_rows:
        return CSVCommitResponse(
            imported_count=0,
            failed_count=0,
            message="No rows provided for import.",
        )

    program_map: Dict[str, str] = {
        p.code.upper(): p.id for p in db.query(Program).all()
    }
    section_map: Dict[str, str] = {
        s.name.upper(): s.id for s in db.query(Section).all()
    }

    imported = 0
    try:
        for row in valid_rows:
            if not row.is_valid:
                continue

            prog_id = program_map.get(row.program_code.upper())
            sec_id = section_map.get(row.section_name.upper()) if row.section_name else None

            if not prog_id:
                continue

            student = Student(
                student_number=row.student_number,
                first_name=row.first_name,
                middle_name=row.middle_name,
                last_name=row.last_name,
                email=row.email,
                gender=row.gender,
                program_id=prog_id,
                year_level=row.year_level,
                current_section_id=sec_id,
                status="active",
            )
            db.add(student)
            imported += 1

        db.commit()
        return CSVCommitResponse(
            imported_count=imported,
            failed_count=len(valid_rows) - imported,
            message=f"Successfully imported {imported} student records.",
        )
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to commit student import: {str(e)}")
