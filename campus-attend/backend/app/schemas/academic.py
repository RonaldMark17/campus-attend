from typing import List, Optional
from datetime import date, time, datetime
from pydantic import BaseModel, ConfigDict, Field

# Academic Term
class AcademicTermResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    start_date: date
    end_date: date
    is_current: bool
    is_active: bool

class AcademicTermCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=20)
    name: str = Field(..., min_length=2, max_length=100)
    start_date: date
    end_date: date
    is_current: bool = False
    is_active: bool = True

# Department
class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    is_active: bool

# Program
class ProgramResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    department_id: str
    code: str
    name: str
    is_active: bool

# Subject
class SubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    department_id: str
    code: str
    title: str
    units: float
    is_active: bool

# Section
class SectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    program_id: str
    academic_term_id: str
    year_level: int
    name: str

# Class Schedule
class ClassScheduleCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Sun, 1=Mon, ..., 6=Sat")
    start_time: time
    end_time: time
    room: Optional[str] = Field(None, max_length=50)

class ClassScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    class_offering_id: str
    day_of_week: int
    start_time: time
    end_time: time
    room: Optional[str] = None

# Class Offering
class ClassOfferingCreate(BaseModel):
    academic_term_id: str
    subject_id: str
    section_id: str
    instructor_id: str
    room: Optional[str] = None
    schedules: Optional[List[ClassScheduleCreate]] = []

class ClassOfferingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    academic_term_id: str
    subject_id: str
    section_id: str
    instructor_id: str
    room: Optional[str] = None
    status: str
    created_at: datetime
    # Enriched fields for easy UI presentation
    subject_code: Optional[str] = None
    subject_title: Optional[str] = None
    section_name: Optional[str] = None
    instructor_name: Optional[str] = None
    enrolled_count: Optional[int] = 0
    schedules: List[ClassScheduleResponse] = []

# Enrollment
class EnrollmentCreate(BaseModel):
    student_id: str

class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    student_id: str
    class_offering_id: str
    enrollment_date: date
    status: str
    student_number: Optional[str] = None
    student_name: Optional[str] = None

# Schedule Conflict
class ScheduleConflictCheck(BaseModel):
    offering_id: Optional[str] = None
    instructor_id: str
    room: Optional[str] = None
    section_id: str
    day_of_week: int
    start_time: time
    end_time: time

class ScheduleConflictResult(BaseModel):
    has_conflict: bool
    conflict_type: Optional[str] = None # 'room', 'instructor', 'section'
    message: Optional[str] = None
