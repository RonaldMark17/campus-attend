from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.attendance import ClassMeeting
from app.permissions.guards import get_current_user, require_role
from app.schemas.attendance import (
    ClassMeetingCreate,
    ClassMeetingResponse,
    AttendanceSheetResponse,
    AttendanceSubmissionRequest,
    AttendanceSubmissionResponse,
    CorrectionRequestCreate,
    CorrectionRequestReview,
    CorrectionRequestResponse,
)
from app.services.attendance_service import (
    open_or_get_meeting,
    get_meeting_attendance_sheet,
    submit_meeting_attendance,
    create_correction_request,
    review_correction_request,
    list_correction_requests,
)

router = APIRouter(prefix="/attendance", tags=["Attendance Tracking"])

# --- Class Meetings ---
@router.get("/meetings", response_model=List[ClassMeetingResponse])
def list_meetings(
    offering_id: str = Query(...),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List meetings for a class offering, optionally filtered by date range."""
    query = db.query(ClassMeeting).filter(ClassMeeting.class_offering_id == offering_id)
    if start_date:
        query = query.filter(ClassMeeting.meeting_date >= start_date)
    if end_date:
        query = query.filter(ClassMeeting.meeting_date <= end_date)

    return query.order_by(ClassMeeting.meeting_date.desc()).all()

@router.post("/meetings/open", response_model=ClassMeetingResponse)
def open_meeting_session(
    payload: ClassMeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Open or retrieve a class meeting session for a scheduled date in 'draft' status.
    """
    try:
        meeting = open_or_get_meeting(
            db=db,
            offering_id=payload.class_offering_id,
            meeting_date=payload.meeting_date,
            user=current_user,
        )
        return meeting
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/meetings/{meeting_id}/sheet", response_model=AttendanceSheetResponse)
def get_attendance_sheet(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch the student roster sheet and recorded attendance marks for a meeting session.
    """
    try:
        sheet = get_meeting_attendance_sheet(db, meeting_id, current_user)
        return sheet
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/meetings/{meeting_id}/submit", response_model=AttendanceSubmissionResponse)
def submit_attendance(
    meeting_id: str,
    payload: AttendanceSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Batch submit final attendance for a class meeting transactionally.
    Transitions session from 'draft' to 'submitted' and logs audit trail.
    """
    try:
        count = submit_meeting_attendance(
            db=db,
            meeting_id=meeting_id,
            records=payload.records,
            notes=payload.notes,
            user=current_user,
        )
        return AttendanceSubmissionResponse(
            meeting_id=meeting_id,
            submitted_count=count,
            status="submitted",
            submitted_at=datetime.now(timezone.utc),
            message=f"Attendance successfully recorded for {count} students.",
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# --- Attendance Correction Requests ---
@router.post("/corrections/request", response_model=CorrectionRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_correction_request(
    payload: CorrectionRequestCreate,
    current_user: User = Depends(require_role("instructor", "admin")),
    db: Session = Depends(get_db),
):
    """
    Instructor submits a correction request with reason for a submitted class meeting.
    """
    try:
        req = create_correction_request(
            db=db,
            record_id=payload.attendance_record_id,
            requested_status=payload.requested_status,
            reason=payload.reason,
            user=current_user,
        )
        return list_correction_requests(db, status_filter=None)[0]
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/corrections", response_model=List[CorrectionRequestResponse])
def get_correction_requests(
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List attendance correction requests (e.g. pending review)."""
    return list_correction_requests(db, status_filter=status_filter)

@router.put("/corrections/{request_id}/review", response_model=CorrectionRequestResponse)
def review_correction(
    request_id: str,
    payload: CorrectionRequestReview,
    current_user: User = Depends(require_role("dept_head", "admin")),
    db: Session = Depends(get_db),
):
    """
    Department Head or Admin reviews and approves or rejects an attendance correction request.
    """
    try:
        req = review_correction_request(
            db=db,
            request_id=request_id,
            review_status=payload.review_status,
            review_notes=payload.review_notes,
            reviewer=current_user,
        )
        return list_correction_requests(db, status_filter=None)[0]
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
