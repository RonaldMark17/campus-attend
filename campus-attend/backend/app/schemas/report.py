from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class DailyAttendanceRecordItem(BaseModel):
    student_number: str
    student_name: str
    gender: Optional[str] = None
    status: str # present, absent, late, excused, unmarked
    remarks: Optional[str] = None
    recorded_at: Optional[datetime] = None

class DailyClassReport(BaseModel):
    class_offering_id: str
    subject_code: str
    subject_title: str
    section_name: str
    instructor_name: str
    meeting_date: date
    meeting_status: str
    total_enrolled: int
    present_count: int
    late_count: int
    absent_count: int
    excused_count: int
    unmarked_count: int
    attendance_rate: float
    records: List[DailyAttendanceRecordItem]

class StudentSubjectAttendanceSummary(BaseModel):
    class_offering_id: str
    subject_code: str
    subject_title: str
    section_name: str
    instructor_name: str
    total_meetings: int
    present_count: int
    late_count: int
    absent_count: int
    excused_count: int
    attendance_rate: float
    at_risk_absences: bool

class StudentAttendanceTranscript(BaseModel):
    student_id: str
    student_number: str
    student_name: str
    program_code: str
    program_name: str
    overall_meetings: int
    overall_present: int
    overall_late: int
    overall_absent: int
    overall_excused: int
    overall_attendance_rate: float
    subject_summaries: List[StudentSubjectAttendanceSummary]

class OfferingStudentSummary(BaseModel):
    student_id: str
    student_number: str
    student_name: str
    total_meetings: int
    present_count: int
    late_count: int
    absent_count: int
    excused_count: int
    attendance_rate: float
    absence_rate: float
    is_at_risk: bool # e.g. absence rate >= 20%

class OfferingAggregatedReport(BaseModel):
    class_offering_id: str
    subject_code: str
    subject_title: str
    section_name: str
    term_name: str
    instructor_name: str
    total_meetings_held: int
    total_enrolled_students: int
    average_attendance_rate: float
    students_at_risk_count: int
    students: List[OfferingStudentSummary]

class IncompleteMeetingItem(BaseModel):
    meeting_id: str
    class_offering_id: str
    subject_code: str
    section_name: str
    instructor_name: str
    meeting_date: date
    status: str
    unmarked_count: int
