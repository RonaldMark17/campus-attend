from sqlalchemy import String, Text, Date, Time, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ClassMeeting(Base):
    __tablename__ = "class_meetings"
    __table_args__ = (
        UniqueConstraint("class_offering_id", "meeting_date", name="uq_offering_meeting_date"),
        CheckConstraint(
            "status IN ('draft', 'submitted', 'closed')",
            name="check_valid_meeting_status"
        ),
        Index("idx_meetings_offering_date", "class_offering_id", "meeting_date"),
    )

    class_offering_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_offerings.id", ondelete="RESTRICT"), nullable=False)
    meeting_date: Mapped[Date] = mapped_column(Date, nullable=False)
    start_time: Mapped[Time] = mapped_column(Time, nullable=True)
    end_time: Mapped[Time] = mapped_column(Time, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    
    scheduled_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships
    class_offering = relationship("ClassOffering", back_populates="meetings")
    attendance_records = relationship("AttendanceRecord", back_populates="class_meeting", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("class_meeting_id", "enrollment_id", name="uq_meeting_enrollment_attendance"),
        CheckConstraint(
            "status IN ('present', 'absent', 'late', 'excused')",
            name="check_valid_attendance_status"
        ),
        Index("idx_attendance_meeting", "class_meeting_id"),
        Index("idx_attendance_enrollment", "enrollment_id", "status"),
    )

    class_meeting_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_meetings.id", ondelete="CASCADE"), nullable=False)
    enrollment_id: Mapped[str] = mapped_column(String(36), ForeignKey("enrollments.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False) # 'present', 'absent', 'late', 'excused'
    remarks: Mapped[str] = mapped_column(Text, nullable=True)
    recorded_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recorded_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    class_meeting = relationship("ClassMeeting", back_populates="attendance_records")
    enrollment = relationship("Enrollment", back_populates="attendance_records")
    correction_requests = relationship("AttendanceCorrectionRequest", back_populates="attendance_record", cascade="all, delete-orphan")

class AttendanceCorrectionRequest(Base):
    __tablename__ = "attendance_correction_requests"
    __table_args__ = (
        CheckConstraint(
            "requested_status IN ('present', 'absent', 'late', 'excused')",
            name="check_valid_requested_status"
        ),
        CheckConstraint(
            "review_status IN ('pending', 'approved', 'rejected')",
            name="check_valid_review_status"
        ),
    )

    attendance_record_id: Mapped[str] = mapped_column(String(36), ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False)
    requested_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    requested_status: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    
    reviewed_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    review_notes: Mapped[str] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    attendance_record = relationship("AttendanceRecord", back_populates="correction_requests")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

