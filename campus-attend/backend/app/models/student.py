from sqlalchemy import String, Integer, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'inactive', 'graduated', 'dropped')",
            name="check_valid_student_status"
        ),
        Index("idx_students_lookup", "student_number", "last_name", "first_name"),
    )

    student_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False) # e.g. "2024-00123"
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    middle_name: Mapped[str] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    suffix: Mapped[str] = mapped_column(String(10), nullable=True) # e.g. "Jr.", "III"
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=True)
    gender: Mapped[str] = mapped_column(String(20), nullable=True) # "Male", "Female", etc.
    
    program_id: Mapped[str] = mapped_column(String(36), ForeignKey("programs.id", ondelete="RESTRICT"), nullable=False)
    year_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_section_id: Mapped[str] = mapped_column(String(36), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    # Relationships
    program = relationship("Program", back_populates="students")
    current_section = relationship("Section", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        parts = [self.last_name + ",", self.first_name]
        if self.middle_name:
            parts.append(self.middle_name[0] + ".")
        if self.suffix:
            parts.append(self.suffix)
        return " ".join(parts)
