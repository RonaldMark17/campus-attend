from typing import List, Optional
from datetime import date, time, datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.academic import ClassOfferingResponse

class ClassMeetingBase(BaseModel):
    class_offering_id: str
    meeting_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    notes: Optional[str] = None

class ClassMeetingCreate(ClassMeetingBase):
    pass

class ClassMeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    class_offering_id: str
    meeting_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: str
    scheduled_by_id: Optional[str] = None
    submitted_by_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

# Attendance Record Item in submission
class AttendanceRecordItem(BaseModel):
    enrollment_id: str
    status: str = Field(..., pattern="^(present|absent|late|excused)$")
    remarks: Optional[str] = None

# Attendance Sheet Student Row
class AttendanceSheetStudent(BaseModel):
    enrollment_id: str
    student_id: str
    student_number: str
    full_name: str
    gender: Optional[str] = None
    status: Optional[str] = None # 'present', 'absent', 'late', 'excused' or None if unmarked
    remarks: Optional[str] = None
    attendance_record_id: Optional[str] = None

class AttendanceSheetResponse(BaseModel):
    meeting: ClassMeetingResponse
    offering: ClassOfferingResponse
    students: List[AttendanceSheetStudent]
    can_edit: bool
    summary: dict # counts of present, absent, late, excused, unmarked

class AttendanceSubmissionRequest(BaseModel):
    records: List[AttendanceRecordItem]
    notes: Optional[str] = None

class AttendanceSubmissionResponse(BaseModel):
    meeting_id: str
    submitted_count: int
    status: str
    submitted_at: datetime
    message: str

# Correction Request Schemas
class CorrectionRequestCreate(BaseModel):
    attendance_record_id: str
    requested_status: str = Field(..., pattern="^(present|absent|late|excused)$")
    reason: str = Field(..., min_length=5, max_length=500)

class CorrectionRequestReview(BaseModel):
    review_status: str = Field(..., pattern="^(approved|rejected)$")
    review_notes: Optional[str] = None

class CorrectionRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    attendance_record_id: str
    student_number: Optional[str] = None
    student_name: Optional[str] = None
    subject_code: Optional[str] = None
    meeting_date: Optional[date] = None
    current_status: Optional[str] = None
    requested_status: str
    reason: str
    requested_by_name: Optional[str] = None
    review_status: str
    review_notes: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
