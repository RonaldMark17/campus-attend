from sqlalchemy import String, Boolean, Date, Integer, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    programs = relationship("Program", back_populates="department", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="department")

class Program(Base):
    __tablename__ = "programs"

    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="programs")
    students = relationship("Student", back_populates="program")
    sections = relationship("Section", back_populates="program")

class AcademicTerm(Base):
    __tablename__ = "academic_terms"

    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False) # e.g. "2026-1S"
    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "AY 2026-2027 1st Semester"
    start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    sections = relationship("Section", back_populates="academic_term")
    class_offerings = relationship("ClassOffering", back_populates="academic_term")

class Section(Base):
    __tablename__ = "sections"

    program_id: Mapped[str] = mapped_column(String(36), ForeignKey("programs.id", ondelete="RESTRICT"), nullable=False)
    academic_term_id: Mapped[str] = mapped_column(String(36), ForeignKey("academic_terms.id", ondelete="RESTRICT"), nullable=False)
    year_level: Mapped[int] = mapped_column(Integer, nullable=False) # 1, 2, 3, 4
    name: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "BSCS 3-A"

    # Relationships
    program = relationship("Program", back_populates="sections")
    academic_term = relationship("AcademicTerm", back_populates="sections")
    students = relationship("Student", back_populates="current_section")
    class_offerings = relationship("ClassOffering", back_populates="section")

class Subject(Base):
    __tablename__ = "subjects"

    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False) # e.g. "CS101"
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    units: Mapped[float] = mapped_column(Numeric(3, 1), default=3.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="subjects")
    class_offerings = relationship("ClassOffering", back_populates="subject")
