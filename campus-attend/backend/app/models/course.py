from sqlalchemy import String, Integer, Time, Date, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ClassOffering(Base):
    __tablename__ = "class_offerings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'completed', 'cancelled')",
            name="check_valid_class_offering_status"
        ),
    )

    academic_term_id: Mapped[str] = mapped_column(String(36), ForeignKey("academic_terms.id", ondelete="RESTRICT"), nullable=False)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)
    section_id: Mapped[str] = mapped_column(String(36), ForeignKey("sections.id", ondelete="RESTRICT"), nullable=False)
    instructor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    room: Mapped[str] = mapped_column(String(50), nullable=True) # e.g. "Lab 301"
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    # Relationships
    academic_term = relationship("AcademicTerm", back_populates="class_offerings")
    subject = relationship("Subject", back_populates="class_offerings")
    section = relationship("Section", back_populates="class_offerings")
    instructor = relationship("User", back_populates="class_offerings")
    schedules = relationship("ClassSchedule", back_populates="class_offering", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="class_offering", cascade="all, delete-orphan")
    meetings = relationship("ClassMeeting", back_populates="class_offering", cascade="all, delete-orphan")

class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    class_offering_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_offerings.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False) # 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False)
    room: Mapped[str] = mapped_column(String(50), nullable=True)

    # Relationships
    class_offering = relationship("ClassOffering", back_populates="schedules")

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "class_offering_id", name="uq_student_class_offering"),
        CheckConstraint(
            "status IN ('enrolled', 'dropped', 'withdrawn')",
            name="check_valid_enrollment_status"
        ),
    )

    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="RESTRICT"), nullable=False)
    class_offering_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_offerings.id", ondelete="RESTRICT"), nullable=False)
    enrollment_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="enrolled", nullable=False)

    # Relationships
    student = relationship("Student", back_populates="enrollments")
    class_offering = relationship("ClassOffering", back_populates="enrollments")
    attendance_records = relationship("AttendanceRecord", back_populates="enrollment", cascade="all, delete-orphan")
