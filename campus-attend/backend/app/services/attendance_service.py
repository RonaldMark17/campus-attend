from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.course import ClassOffering, Enrollment
from app.models.attendance import ClassMeeting, AttendanceRecord, AttendanceCorrectionRequest
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.academic import ClassOfferingResponse
from app.schemas.attendance import (
    ClassMeetingResponse,
    AttendanceRecordItem,
    AttendanceSheetStudent,
    AttendanceSheetResponse,
    CorrectionRequestResponse,
)

def open_or_get_meeting(
    db: Session,
    offering_id: str,
    meeting_date: date,
    user: User,
) -> ClassMeeting:
    """Retrieve an existing class meeting or create a new one in 'draft' status."""
    offering = db.query(ClassOffering).filter(ClassOffering.id == offering_id).first()
    if not offering:
        raise ValueError("Class offering not found.")

    # Access control: Instructors can only open meetings for their assigned classes
    if user.role == "instructor" and offering.instructor_id != user.id:
        raise PermissionError("You are not assigned to instruct this class offering.")

    meeting = (
        db.query(ClassMeeting)
        .filter(
            ClassMeeting.class_offering_id == offering_id,
            ClassMeeting.meeting_date == meeting_date,
        )
        .first()
    )

    if not meeting:
        meeting = ClassMeeting(
            class_offering_id=offering_id,
            meeting_date=meeting_date,
            status="draft",
            scheduled_by_id=user.id,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

    return meeting

def get_meeting_attendance_sheet(
    db: Session,
    meeting_id: str,
    user: User,
) -> AttendanceSheetResponse:
    """Retrieve student roster and recorded attendance statuses for a meeting."""
    meeting = db.query(ClassMeeting).filter(ClassMeeting.id == meeting_id).first()
    if not meeting:
        raise ValueError("Class meeting not found.")

    offering = meeting.class_offering

    # Verify authorization
    if user.role == "instructor" and offering.instructor_id != user.id:
        raise PermissionError("Access denied: Not assigned to this class offering.")

    # Load enrolled students
    enrollments = (
        db.query(Enrollment)
        .filter(
            Enrollment.class_offering_id == offering.id,
            Enrollment.status == "enrolled",
        )
        .all()
    )

    # Sort enrollments alphabetically by student last name, first name
    enrollments.sort(key=lambda e: (e.student.last_name, e.student.first_name))

    # Existing records map: enrollment_id -> AttendanceRecord
    existing_records = {
        r.enrollment_id: r for r in meeting.attendance_records
    }

    students_sheet: List[AttendanceSheetStudent] = []
    tally = {"present": 0, "late": 0, "absent": 0, "excused": 0, "unmarked": 0}

    for enr in enrollments:
        rec = existing_records.get(enr.id)
        current_status = rec.status if rec else None
        current_remarks = rec.remarks if rec else None
        record_id = rec.id if rec else None

        if current_status in tally:
            tally[current_status] += 1
        else:
            tally["unmarked"] += 1

        students_sheet.append(
            AttendanceSheetStudent(
                enrollment_id=enr.id,
                student_id=enr.student.id,
                student_number=enr.student.student_number,
                full_name=enr.student.full_name,
                gender=enr.student.gender,
                status=current_status,
                remarks=current_remarks,
                attendance_record_id=record_id,
            )
        )

    # Editable if in draft status and acting user is instructor or admin
    can_edit = (meeting.status == "draft") and (user.role == "admin" or offering.instructor_id == user.id)

    offering_resp = ClassOfferingResponse(
        id=offering.id,
        academic_term_id=offering.academic_term_id,
        subject_id=offering.subject_id,
        section_id=offering.section_id,
        instructor_id=offering.instructor_id,
        room=offering.room,
        status=offering.status,
        created_at=offering.created_at,
        subject_code=offering.subject.code if offering.subject else None,
        subject_title=offering.subject.title if offering.subject else None,
        section_name=offering.section.name if offering.section else None,
        instructor_name=offering.instructor.full_name if offering.instructor else None,
        enrolled_count=len(enrollments),
        schedules=[],
    )

    meeting_resp = ClassMeetingResponse.model_validate(meeting)

    return AttendanceSheetResponse(
        meeting=meeting_resp,
        offering=offering_resp,
        students=students_sheet,
        can_edit=can_edit,
        summary=tally,
    )

def submit_meeting_attendance(
    db: Session,
    meeting_id: str,
    records: List[AttendanceRecordItem],
    notes: Optional[str],
    user: User,
) -> int:
    """
    Atomically validate and save attendance records, transitioning meeting status from draft to submitted.
    """
    meeting = db.query(ClassMeeting).filter(ClassMeeting.id == meeting_id).first()
    if not meeting:
        raise ValueError("Class meeting not found.")

    offering = meeting.class_offering

    # Security check: Assigned instructor or admin
    if user.role == "instructor" and offering.instructor_id != user.id:
        raise PermissionError("Access denied: Not assigned to this class offering.")

    if meeting.status != "draft" and user.role != "admin":
        raise ValueError("This attendance meeting has already been submitted and is locked.")

    # Guard: Check for duplicate enrollment IDs in the submission payload
    submitted_enrollment_ids = [r.enrollment_id for r in records]
    if len(submitted_enrollment_ids) != len(set(submitted_enrollment_ids)):
        raise ValueError("Duplicate enrollment IDs detected in submission payload.")

    # Guard: Verify each enrollment belongs to this class offering
    valid_enrollment_ids = {
        e.id
        for e in db.query(Enrollment.id)
        .filter(
            Enrollment.class_offering_id == offering.id,
            Enrollment.status == "enrolled",
        )
        .all()
    }

    for eid in submitted_enrollment_ids:
        if eid not in valid_enrollment_ids:
            raise ValueError(f"Enrollment ID '{eid}' does not belong to this class offering.")

    now = datetime.now(timezone.utc)

    # Upsert attendance records
    existing_records = {
        r.enrollment_id: r for r in meeting.attendance_records
    }

    tally = {"present": 0, "late": 0, "absent": 0, "excused": 0}

    for item in records:
        tally[item.status] = tally.get(item.status, 0) + 1
        rec = existing_records.get(item.enrollment_id)
        if rec:
            rec.status = item.status
            rec.remarks = item.remarks
            rec.recorded_by_id = user.id
            rec.recorded_at = now
        else:
            new_rec = AttendanceRecord(
                class_meeting_id=meeting.id,
                enrollment_id=item.enrollment_id,
                status=item.status,
                remarks=item.remarks,
                recorded_by_id=user.id,
                recorded_at=now,
            )
            db.add(new_rec)

    # Transition meeting to submitted
    meeting.status = "submitted"
    meeting.submitted_by_id = user.id
    meeting.submitted_at = now
    if notes:
        meeting.notes = notes

    # Immutable Audit Log
    audit = AuditLog(
        user_id=user.id,
        action="SUBMIT_ATTENDANCE",
        entity_type="class_meeting",
        entity_id=meeting.id,
        ip_address=None,
        user_agent=None,
        old_values=None,
        new_values={
            "meeting_id": meeting.id,
            "offering_id": offering.id,
            "meeting_date": meeting.meeting_date.isoformat(),
            "tally": tally,
            "total_submitted": len(records),
        },
        timestamp=now,
    )
    db.add(audit)

    db.commit()
    return len(records)

def create_correction_request(
    db: Session,
    record_id: str,
    requested_status: str,
    reason: str,
    user: User,
) -> AttendanceCorrectionRequest:
    """Submit a formal request to correct a submitted attendance record."""
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise ValueError("Attendance record not found.")

    offering = record.class_meeting.class_offering
    if user.role == "instructor" and offering.instructor_id != user.id:
        raise PermissionError("Access denied: You are not assigned to this class offering.")

    if record.class_meeting.status == "draft":
        raise ValueError("Meeting is still in draft; you can update attendance directly without a correction request.")

    # Check for existing pending request for this record
    pending = (
        db.query(AttendanceCorrectionRequest)
        .filter(
            AttendanceCorrectionRequest.attendance_record_id == record_id,
            AttendanceCorrectionRequest.review_status == "pending",
        )
        .first()
    )
    if pending:
        raise ValueError("A correction request is already pending review for this student record.")

    req = AttendanceCorrectionRequest(
        attendance_record_id=record_id,
        requested_by_id=user.id,
        requested_status=requested_status,
        reason=reason,
        review_status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

def review_correction_request(
    db: Session,
    request_id: str,
    review_status: str,
    review_notes: Optional[str],
    reviewer: User,
) -> AttendanceCorrectionRequest:
    """Approve or reject an attendance correction request."""
    if reviewer.role not in ["admin", "dept_head"]:
        raise PermissionError("Only Department Heads and Administrators can review correction requests.")

    req = (
        db.query(AttendanceCorrectionRequest)
        .filter(AttendanceCorrectionRequest.id == request_id)
        .first()
    )
    if not req:
        raise ValueError("Correction request not found.")

    if req.review_status != "pending":
        raise ValueError("This correction request has already been reviewed.")

    now = datetime.now(timezone.utc)
    req.review_status = review_status
    req.review_notes = review_notes
    req.reviewed_by_id = reviewer.id
    req.reviewed_at = now

    record = req.attendance_record
    old_status = record.status

    if review_status == "approved":
        # Update attendance status
        record.status = req.requested_status
        record.updated_at = now

    # Audit Log
    audit = AuditLog(
        user_id=reviewer.id,
        action=f"CORRECTION_{review_status.upper()}",
        entity_type="attendance_record",
        entity_id=record.id,
        ip_address=None,
        user_agent=None,
        old_values={"status": old_status},
        new_values={
            "status": record.status,
            "request_id": req.id,
            "reason": req.reason,
            "reviewer": reviewer.full_name,
        },
        timestamp=now,
    )
    db.add(audit)

    db.commit()
    db.refresh(req)
    return req

def list_correction_requests(
    db: Session,
    status_filter: Optional[str] = None,
) -> List[CorrectionRequestResponse]:
    """List attendance correction requests."""
    query = db.query(AttendanceCorrectionRequest)
    if status_filter:
        query = query.filter(AttendanceCorrectionRequest.review_status == status_filter)

    requests = query.order_by(AttendanceCorrectionRequest.created_at.desc()).all()
    results = []

    for r in requests:
        rec = r.attendance_record
        student = rec.enrollment.student if rec and rec.enrollment else None
        meeting = rec.class_meeting if rec else None
        offering = meeting.class_offering if meeting else None

        results.append(
            CorrectionRequestResponse(
                id=r.id,
                attendance_record_id=r.attendance_record_id,
                student_number=student.student_number if student else None,
                student_name=student.full_name if student else None,
                subject_code=offering.subject.code if offering and offering.subject else None,
                meeting_date=meeting.meeting_date if meeting else None,
                current_status=rec.status if rec else None,
                requested_status=r.requested_status,
                reason=r.reason,
                requested_by_name=r.requested_by.full_name if hasattr(r, "requested_by") and r.requested_by else None,
                review_status=r.review_status,
                review_notes=r.review_notes,
                reviewed_by_name=r.reviewed_by.full_name if hasattr(r, "reviewed_by") and r.reviewed_by else None,
                created_at=r.created_at,
                reviewed_at=r.reviewed_at,
            )
        )

    return results
