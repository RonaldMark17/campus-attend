from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class StudentBase(BaseModel):
    student_number: str = Field(..., min_length=3, max_length=30)
    first_name: str = Field(..., min_length=1, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    suffix: Optional[str] = Field(None, max_length=10)
    email: Optional[str] = Field(None, max_length=255)
    gender: Optional[str] = Field(None, max_length=20)
    program_id: str
    year_level: int = Field(default=1, ge=1, le=6)
    current_section_id: Optional[str] = None
    status: str = Field(default="active", pattern="^(active|inactive|graduated|dropped)$")

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    suffix: Optional[str] = Field(None, max_length=10)
    email: Optional[str] = Field(None, max_length=255)
    gender: Optional[str] = Field(None, max_length=20)
    program_id: Optional[str] = None
    year_level: Optional[int] = Field(None, ge=1, le=6)
    current_section_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|graduated|dropped)$")

class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_number: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    suffix: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    program_id: str
    year_level: int
    current_section_id: Optional[str] = None
    status: str
    created_at: datetime
    program_code: Optional[str] = None
    section_name: Optional[str] = None

class StudentPaginationResponse(BaseModel):
    items: List[StudentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# CSV Import Models
class CSVRowPreview(BaseModel):
    row_number: int
    student_number: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    program_code: str
    year_level: int
    section_name: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    is_valid: bool
    errors: List[str]

class CSVPreviewResponse(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    rows: List[CSVRowPreview]

class CSVCommitRequest(BaseModel):
    rows: List[CSVRowPreview]

class CSVCommitResponse(BaseModel):
    imported_count: int
    failed_count: int
    message: str
