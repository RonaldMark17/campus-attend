from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional

from app.core.database import get_db
from app.models.user import User
from app.permissions.guards import get_current_user, require_role
from app.schemas.report import (
    DailyClassReport,
    StudentAttendanceTranscript,
    OfferingAggregatedReport,
    IncompleteMeetingItem,
)
from app.services.report_service import (
    get_daily_class_report,
    get_student_attendance_transcript,
    get_offering_aggregated_report,
    get_incomplete_attendance_reports,
    export_daily_report_csv,
    export_offering_report_csv,
    export_offering_report_pdf,
)

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/daily", response_model=DailyClassReport)
def get_daily_report(
    offering_id: str = Query(...),
    meeting_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve daily attendance sheet report for an offering."""
    try:
        return get_daily_class_report(db, offering_id, meeting_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/daily/csv")
def download_daily_report_csv(
    offering_id: str = Query(...),
    meeting_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download daily attendance report as CSV."""
    try:
        rep = get_daily_class_report(db, offering_id, meeting_date)
        csv_data = export_daily_report_csv(rep)
        filename = f"daily_attendance_{rep.subject_code}_{meeting_date}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/offering/{offering_id}", response_model=OfferingAggregatedReport)
def get_offering_report(
    offering_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve aggregated semester attendance metrics for a class offering."""
    try:
        return get_offering_aggregated_report(db, offering_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/offering/{offering_id}/csv")
def download_offering_report_csv(
    offering_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download aggregated semester attendance report as CSV."""
    try:
        rep = get_offering_aggregated_report(db, offering_id)
        csv_data = export_offering_report_csv(rep)
        filename = f"offering_summary_{rep.subject_code}_{rep.section_name}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/offering/{offering_id}/pdf")
def download_offering_report_pdf(
    offering_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download official offering attendance summary as institutional PDF."""
    try:
        rep = get_offering_aggregated_report(db, offering_id)
        pdf_bytes = export_offering_report_pdf(rep)
        filename = f"official_attendance_{rep.subject_code}_{rep.section_name}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/student/{student_id}", response_model=StudentAttendanceTranscript)
def get_student_transcript(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve cumulative attendance transcript across all courses for a student."""
    try:
        return get_student_attendance_transcript(db, student_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/incomplete", response_model=List[IncompleteMeetingItem])
def get_incomplete_meetings(
    current_user: User = Depends(require_role("dept_head", "admin", "registrar")),
    db: Session = Depends(get_db),
):
    """List unsubmitted or incomplete attendance meetings needing administrative review."""
    return get_incomplete_attendance_reports(db)
