import io
import csv
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.academic import Department, Program, Subject, Section, AcademicTerm
from app.models.student import Student
from app.models.course import ClassOffering, Enrollment
from app.models.attendance import ClassMeeting, AttendanceRecord
from app.models.user import User

from app.schemas.report import (
    DailyClassReport,
    DailyAttendanceRecordItem,
    StudentAttendanceTranscript,
    StudentSubjectAttendanceSummary,
    OfferingAggregatedReport,
    OfferingStudentSummary,
    IncompleteMeetingItem,
)

# ReportLab imports for offline PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def get_daily_class_report(db: Session, offering_id: str, meeting_date: date) -> DailyClassReport:
    """Generate daily attendance report for a given class offering and date."""
    offering = db.query(ClassOffering).filter(ClassOffering.id == offering_id).first()
    if not offering:
        raise ValueError("Class offering not found.")

    meeting = (
        db.query(ClassMeeting)
        .filter(ClassMeeting.class_offering_id == offering_id, ClassMeeting.meeting_date == meeting_date)
        .first()
    )

    enrollments = (
        db.query(Enrollment)
        .join(Student, Enrollment.student_id == Student.id)
        .filter(Enrollment.class_offering_id == offering_id, Enrollment.status == "enrolled")
        .order_by(Student.last_name.asc(), Student.first_name.asc())
        .all()
    )

    records_map = {}
    if meeting:
        for rec in meeting.attendance_records:
            records_map[rec.enrollment_id] = rec

    items: List[DailyAttendanceRecordItem] = []
    present_cnt = 0
    late_cnt = 0
    absent_cnt = 0
    excused_cnt = 0
    unmarked_cnt = 0

    for enr in enrollments:
        rec = records_map.get(enr.id)
        if rec:
            st = rec.status
            if st == "present":
                present_cnt += 1
            elif st == "late":
                late_cnt += 1
            elif st == "absent":
                absent_cnt += 1
            elif st == "excused":
                excused_cnt += 1
            items.append(
                DailyAttendanceRecordItem(
                    student_number=enr.student.student_number,
                    student_name=f"{enr.student.last_name}, {enr.student.first_name}",
                    gender=enr.student.gender,
                    status=st,
                    remarks=rec.remarks,
                    recorded_at=rec.recorded_at,
                )
            )
        else:
            unmarked_cnt += 1
            items.append(
                DailyAttendanceRecordItem(
                    student_number=enr.student.student_number,
                    student_name=f"{enr.student.last_name}, {enr.student.first_name}",
                    gender=enr.student.gender,
                    status="unmarked",
                    remarks=None,
                    recorded_at=None,
                )
            )

    total = len(enrollments)
    attendance_rate = round(((present_cnt + late_cnt) / total * 100), 2) if total > 0 else 100.0

    return DailyClassReport(
        class_offering_id=offering.id,
        subject_code=offering.subject.code,
        subject_title=offering.subject.title,
        section_name=offering.section.name,
        instructor_name=offering.instructor.full_name if offering.instructor else "Unassigned",
        meeting_date=meeting_date,
        meeting_status=meeting.status if meeting else "unopened",
        total_enrolled=total,
        present_count=present_cnt,
        late_count=late_cnt,
        absent_count=absent_cnt,
        excused_count=excused_cnt,
        unmarked_count=unmarked_cnt,
        attendance_rate=attendance_rate,
        records=items,
    )

def get_student_attendance_transcript(db: Session, student_id: str) -> StudentAttendanceTranscript:
    """Compile cumulative attendance transcript across all enrolled subjects for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ValueError("Student not found.")

    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id)
        .all()
    )

    subject_summaries: List[StudentSubjectAttendanceSummary] = []
    tot_meetings = 0
    tot_present = 0
    tot_late = 0
    tot_absent = 0
    tot_excused = 0

    for enr in enrollments:
        offering = enr.class_offering
        meetings = (
            db.query(ClassMeeting)
            .filter(ClassMeeting.class_offering_id == offering.id, ClassMeeting.status == "submitted")
            .all()
        )
        meeting_ids = [m.id for m in meetings]
        num_meetings = len(meeting_ids)

        if num_meetings > 0:
            records = (
                db.query(AttendanceRecord)
                .filter(AttendanceRecord.enrollment_id == enr.id, AttendanceRecord.class_meeting_id.in_(meeting_ids))
                .all()
            )
        else:
            records = []

        p_cnt = sum(1 for r in records if r.status == "present")
        l_cnt = sum(1 for r in records if r.status == "late")
        a_cnt = sum(1 for r in records if r.status == "absent")
        e_cnt = sum(1 for r in records if r.status == "excused")

        tot_meetings += num_meetings
        tot_present += p_cnt
        tot_late += l_cnt
        tot_absent += a_cnt
        tot_excused += e_cnt

        sub_rate = round(((p_cnt + l_cnt) / num_meetings * 100), 2) if num_meetings > 0 else 100.0
        absence_rate = round((a_cnt / num_meetings * 100), 2) if num_meetings > 0 else 0.0

        subject_summaries.append(
            StudentSubjectAttendanceSummary(
                class_offering_id=offering.id,
                subject_code=offering.subject.code,
                subject_title=offering.subject.title,
                section_name=offering.section.name,
                instructor_name=offering.instructor.full_name if offering.instructor else "Unassigned",
                total_meetings=num_meetings,
                present_count=p_cnt,
                late_count=l_cnt,
                absent_count=a_cnt,
                excused_count=e_cnt,
                attendance_rate=sub_rate,
                at_risk_absences=absence_rate >= 20.0,
            )
        )

    overall_rate = round(((tot_present + tot_late) / tot_meetings * 100), 2) if tot_meetings > 0 else 100.0

    return StudentAttendanceTranscript(
        student_id=student.id,
        student_number=student.student_number,
        student_name=f"{student.last_name}, {student.first_name}",
        program_code=student.program.code if student.program else "N/A",
        program_name=student.program.name if student.program else "N/A",
        overall_meetings=tot_meetings,
        overall_present=tot_present,
        overall_late=tot_late,
        overall_absent=tot_absent,
        overall_excused=tot_excused,
        overall_attendance_rate=overall_rate,
        subject_summaries=subject_summaries,
    )

def get_offering_aggregated_report(db: Session, offering_id: str) -> OfferingAggregatedReport:
    """Generate semester aggregated summary for an entire class offering."""
    offering = db.query(ClassOffering).filter(ClassOffering.id == offering_id).first()
    if not offering:
        raise ValueError("Class offering not found.")

    submitted_meetings = (
        db.query(ClassMeeting)
        .filter(ClassMeeting.class_offering_id == offering_id, ClassMeeting.status == "submitted")
        .all()
    )
    meeting_ids = [m.id for m in submitted_meetings]
    total_meetings = len(meeting_ids)

    enrollments = (
        db.query(Enrollment)
        .join(Student, Enrollment.student_id == Student.id)
        .filter(Enrollment.class_offering_id == offering_id, Enrollment.status == "enrolled")
        .order_by(Student.last_name.asc(), Student.first_name.asc())
        .all()
    )

    students_summary: List[OfferingStudentSummary] = []
    at_risk_count = 0
    rates_sum = 0.0

    for enr in enrollments:
        if total_meetings > 0:
            recs = (
                db.query(AttendanceRecord)
                .filter(AttendanceRecord.enrollment_id == enr.id, AttendanceRecord.class_meeting_id.in_(meeting_ids))
                .all()
            )
        else:
            recs = []

        p_cnt = sum(1 for r in recs if r.status == "present")
        l_cnt = sum(1 for r in recs if r.status == "late")
        a_cnt = sum(1 for r in recs if r.status == "absent")
        e_cnt = sum(1 for r in recs if r.status == "excused")

        att_rate = round(((p_cnt + l_cnt) / total_meetings * 100), 2) if total_meetings > 0 else 100.0
        abs_rate = round((a_cnt / total_meetings * 100), 2) if total_meetings > 0 else 0.0
        is_risk = abs_rate >= 20.0
        if is_risk:
            at_risk_count += 1

        rates_sum += att_rate

        students_summary.append(
            OfferingStudentSummary(
                student_id=enr.student.id,
                student_number=enr.student.student_number,
                student_name=f"{enr.student.last_name}, {enr.student.first_name}",
                total_meetings=total_meetings,
                present_count=p_cnt,
                late_count=l_cnt,
                absent_count=a_cnt,
                excused_count=e_cnt,
                attendance_rate=att_rate,
                absence_rate=abs_rate,
                is_at_risk=is_risk,
            )
        )

    avg_rate = round(rates_sum / len(enrollments), 2) if enrollments else 100.0

    return OfferingAggregatedReport(
        class_offering_id=offering.id,
        subject_code=offering.subject.code,
        subject_title=offering.subject.title,
        section_name=offering.section.name,
        term_name=offering.academic_term.name if offering.academic_term else "Current Term",
        instructor_name=offering.instructor.full_name if offering.instructor else "Unassigned",
        total_meetings_held=total_meetings,
        total_enrolled_students=len(enrollments),
        average_attendance_rate=avg_rate,
        students_at_risk_count=at_risk_count,
        students=students_summary,
    )

def get_incomplete_attendance_reports(db: Session) -> List[IncompleteMeetingItem]:
    """Identify meetings with unsubmitted drafts or missing student entries."""
    meetings = (
        db.query(ClassMeeting)
        .filter(ClassMeeting.status == "draft")
        .order_by(ClassMeeting.meeting_date.desc())
        .all()
    )

    results = []
    for m in meetings:
        enrolled_count = (
            db.query(func.count(Enrollment.id))
            .filter(Enrollment.class_offering_id == m.class_offering_id, Enrollment.status == "enrolled")
            .scalar()
        )
        recorded_count = len(m.attendance_records)
        unmarked = max(0, enrolled_count - recorded_count)

        results.append(
            IncompleteMeetingItem(
                meeting_id=m.id,
                class_offering_id=m.class_offering_id,
                subject_code=m.class_offering.subject.code,
                section_name=m.class_offering.section.name,
                instructor_name=m.class_offering.instructor.full_name if m.class_offering.instructor else "Unassigned",
                meeting_date=m.meeting_date,
                status=m.status,
                unmarked_count=unmarked,
            )
        )
    return results

# ==================== CSV EXPORT GENERATION ====================

def export_daily_report_csv(report: DailyClassReport) -> str:
    """Generate RFC 4180 compliant CSV for daily attendance."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["CAMPUSATTEND - DAILY ATTENDANCE REPORT"])
    writer.writerow(["Subject", f"{report.subject_code} - {report.subject_title}"])
    writer.writerow(["Section", report.section_name])
    writer.writerow(["Instructor", report.instructor_name])
    writer.writerow(["Date", str(report.meeting_date)])
    writer.writerow(["Status", report.meeting_status.upper()])
    writer.writerow(["Enrolled", report.total_enrolled, "Present", report.present_count, "Late", report.late_count, "Absent", report.absent_count, "Attendance Rate", f"{report.attendance_rate}%"])
    writer.writerow([])
    writer.writerow(["Student Number", "Student Name", "Gender", "Status", "Remarks", "Recorded Time"])

    for r in report.records:
        rec_time = r.recorded_at.strftime("%Y-%m-%d %H:%M:%S") if r.recorded_at else "N/A"
        writer.writerow([r.student_number, r.student_name, r.gender or "N/A", r.status.upper(), r.remarks or "", rec_time])

    return output.getvalue()

def export_offering_report_csv(report: OfferingAggregatedReport) -> str:
    """Generate CSV for class offering semester attendance."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["CAMPUSATTEND - CLASS OFFERING ATTENDANCE SUMMARY"])
    writer.writerow(["Subject", f"{report.subject_code} - {report.subject_title}"])
    writer.writerow(["Section", report.section_name])
    writer.writerow(["Term", report.term_name])
    writer.writerow(["Instructor", report.instructor_name])
    writer.writerow(["Total Meetings", report.total_meetings_held])
    writer.writerow(["Enrolled Students", report.total_enrolled_students])
    writer.writerow(["Class Attendance Avg", f"{report.average_attendance_rate}%"])
    writer.writerow(["At-Risk (>=20% Absences)", report.students_at_risk_count])
    writer.writerow([])
    writer.writerow(["Student Number", "Student Name", "Total Meetings", "Present", "Late", "Absent", "Excused", "Attendance Rate", "Absence Rate", "Status"])

    for s in report.students:
        flag = "AT-RISK (FA WARNING)" if s.is_at_risk else "NORMAL"
        writer.writerow([
            s.student_number,
            s.student_name,
            s.total_meetings,
            s.present_count,
            s.late_count,
            s.absent_count,
            s.excused_count,
            f"{s.attendance_rate}%",
            f"{s.absence_rate}%",
            flag,
        ])

    return output.getvalue()

# ==================== PDF EXPORT GENERATION ====================

def export_offering_report_pdf(report: OfferingAggregatedReport) -> bytes:
    """Generate a clean, professional institutional PDF using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        alignment=1, # Center
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        alignment=1, # Center
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )
    meta_bold = ParagraphStyle(
        "MetaBold",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0f172a"),
    )

    elements = []

    # 1. Header
    elements.append(Paragraph("CAMPUSATTEND COLLEGE MANAGEMENT SYSTEM", title_style))
    elements.append(Paragraph("OFFICIAL SEMESTER ATTENDANCE SUMMARY SHEET • LOCAL ARCHIVE COPY", subtitle_style))
    elements.append(Spacer(1, 14))

    # 2. Meta Grid Table
    meta_data = [
        [
            Paragraph("<b>Subject:</b>", meta_bold),
            Paragraph(f"{report.subject_code} - {report.subject_title}", meta_style),
            Paragraph("<b>Academic Term:</b>", meta_bold),
            Paragraph(report.term_name, meta_style),
        ],
        [
            Paragraph("<b>Section:</b>", meta_bold),
            Paragraph(report.section_name, meta_style),
            Paragraph("<b>Meetings Held:</b>", meta_bold),
            Paragraph(str(report.total_meetings_held), meta_style),
        ],
        [
            Paragraph("<b>Instructor:</b>", meta_bold),
            Paragraph(report.instructor_name, meta_style),
            Paragraph("<b>Class Average:</b>", meta_bold),
            Paragraph(f"<b>{report.average_attendance_rate}%</b>", meta_bold),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[65, 205, 85, 185])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    elements.append(meta_table)
    elements.append(Spacer(1, 12))

    # 3. Student Roster Table
    header_row = ["Student No.", "Student Name", "Held", "P", "L", "A", "E", "Att. %", "Status"]
    table_rows = [header_row]

    for s in report.students:
        status_txt = "AT-RISK" if s.is_at_risk else "OK"
        table_rows.append([
            s.student_number,
            s.student_name,
            str(s.total_meetings),
            str(s.present_count),
            str(s.late_count),
            str(s.absent_count),
            str(s.excused_count),
            f"{s.attendance_rate}%",
            status_txt,
        ])

    roster_table = Table(
        table_rows,
        colWidths=[75, 175, 35, 30, 30, 30, 30, 55, 80],
    )

    t_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]

    # Alternate row styling & highlight at risk
    for idx, s in enumerate(report.students, start=1):
        if s.is_at_risk:
            t_style.append(("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#fee2e2")))
            t_style.append(("TEXTCOLOR", (8, idx), (8, idx), colors.HexColor("#991b1b")))
            t_style.append(("FONTNAME", (8, idx), (8, idx), "Helvetica-Bold"))
        elif idx % 2 == 0:
            t_style.append(("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#f8fafc")))

    roster_table.setStyle(TableStyle(t_style))
    elements.append(roster_table)
    elements.append(Spacer(1, 24))

    # 4. Signatory Block
    sig_data = [
        [
            Paragraph("Prepared by:", meta_bold),
            Paragraph("Verified by:", meta_bold),
            Paragraph("Approved by:", meta_bold),
        ],
        [
            Spacer(1, 22),
            Spacer(1, 22),
            Spacer(1, 22),
        ],
        [
            Paragraph(f"<u>{report.instructor_name}</u><br/>Course Instructor", meta_style),
            Paragraph("<u>____________________________</u><br/>Department Head / Dean", meta_style),
            Paragraph("<u>____________________________</u><br/>College Registrar", meta_style),
        ],
    ]
    sig_table = Table(sig_data, colWidths=[180, 180, 180])
    sig_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(KeepTogether(sig_table))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
