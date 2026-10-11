import sys
from pathlib import Path
from datetime import date, time, datetime, timezone, timedelta

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import (
    User,
    Department,
    Program,
    AcademicTerm,
    Section,
    Subject,
    Student,
    ClassOffering,
    ClassSchedule,
    Enrollment,
    ClassMeeting,
    AttendanceRecord,
    AttendanceCorrectionRequest,
    AuditLog,
)

def seed_database():
    print("[*] Seeding CampusAttend database with realistic testing data...")
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter_by(username="admin").first():
            print("Database already contains seed data. Skipping.")
            return

        # 1. Users
        admin_user = User(
            username="admin",
            email="admin@school.lan",
            hashed_password=hash_password("admin123"),
            full_name="Dr. Eleanor Vance",
            role="admin",
            is_active=True,
        )
        instructor1 = User(
            username="instructor1",
            email="prof.garcia@school.lan",
            hashed_password=hash_password("password123"),
            full_name="Prof. Marcus Garcia",
            role="instructor",
            is_active=True,
        )
        instructor2 = User(
            username="instructor2",
            email="engr.santos@school.lan",
            hashed_password=hash_password("password123"),
            full_name="Engr. Clara Santos",
            role="instructor",
            is_active=True,
        )
        dept_head = User(
            username="depthead",
            email="chair.reyes@school.lan",
            hashed_password=hash_password("password123"),
            full_name="Dr. Roberto Reyes",
            role="dept_head",
            is_active=True,
        )
        registrar = User(
            username="registrar",
            email="records@school.lan",
            hashed_password=hash_password("password123"),
            full_name="Maria Theresa Cruz",
            role="registrar",
            is_active=True,
        )
        db.add_all([admin_user, instructor1, instructor2, dept_head, registrar])
        db.flush()

        # 2. Departments
        ccs = Department(code="CCS", name="College of Computer Studies", is_active=True)
        coe = Department(code="COE", name="College of Engineering", is_active=True)
        db.add_all([ccs, coe])
        db.flush()

        # 3. Programs
        bscs = Program(department_id=ccs.id, code="BSCS", name="Bachelor of Science in Computer Science", is_active=True)
        bsit = Program(department_id=ccs.id, code="BSIT", name="Bachelor of Science in Information Technology", is_active=True)
        bsee = Program(department_id=coe.id, code="BSEE", name="Bachelor of Science in Electrical Engineering", is_active=True)
        db.add_all([bscs, bsit, bsee])
        db.flush()

        # 4. Academic Term
        term = AcademicTerm(
            code="2026-1S",
            name="Academic Year 2026-2027 First Semester",
            start_date=date(2026, 8, 1),
            end_date=date(2026, 12, 15),
            is_current=True,
            is_active=True,
        )
        db.add(term)
        db.flush()

        # 5. Sections
        sec_bscs_1a = Section(program_id=bscs.id, academic_term_id=term.id, year_level=1, name="BSCS 1-A")
        sec_bscs_2a = Section(program_id=bscs.id, academic_term_id=term.id, year_level=2, name="BSCS 2-A")
        sec_bsit_1a = Section(program_id=bsit.id, academic_term_id=term.id, year_level=1, name="BSIT 1-A")
        db.add_all([sec_bscs_1a, sec_bscs_2a, sec_bsit_1a])
        db.flush()

        # 6. Subjects
        sub_cs101 = Subject(department_id=ccs.id, code="CS101", title="Introduction to Computing", units=3.0, is_active=True)
        sub_cs102 = Subject(department_id=ccs.id, code="CS102", title="Data Structures and Algorithms", units=3.0, is_active=True)
        sub_it101 = Subject(department_id=ccs.id, code="IT101", title="Web Systems and Technologies", units=3.0, is_active=True)
        db.add_all([sub_cs101, sub_cs102, sub_it101])
        db.flush()

        # 7. Class Offerings
        offering1 = ClassOffering(
            academic_term_id=term.id,
            subject_id=sub_cs101.id,
            section_id=sec_bscs_1a.id,
            instructor_id=instructor1.id,
            room="ComLab 101",
            status="active",
        )
        offering2 = ClassOffering(
            academic_term_id=term.id,
            subject_id=sub_cs102.id,
            section_id=sec_bscs_2a.id,
            instructor_id=instructor1.id,
            room="ComLab 102",
            status="active",
        )
        offering3 = ClassOffering(
            academic_term_id=term.id,
            subject_id=sub_it101.id,
            section_id=sec_bsit_1a.id,
            instructor_id=instructor2.id,
            room="Lecture Hall B",
            status="active",
        )
        db.add_all([offering1, offering2, offering3])
        db.flush()

        # 8. Schedules
        # MWF 09:00 - 10:00 for offering 1
        for day in [1, 3, 5]: # Mon, Wed, Fri
            db.add(ClassSchedule(
                class_offering_id=offering1.id,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(10, 0),
                room="ComLab 101"
            ))
        # TTh 10:30 - 12:00 for offering 2
        for day in [2, 4]: # Tue, Thu
            db.add(ClassSchedule(
                class_offering_id=offering2.id,
                day_of_week=day,
                start_time=time(10, 30),
                end_time=time(12, 0),
                room="ComLab 102"
            ))
        db.flush()

        # 9. Synthetic Students (40 students)
        first_names = [
            "Liam", "Noah", "Oliver", "James", "Elijah", "Mateo", "Theodore", "Henry", "Lucas", "William",
            "Olivia", "Emma", "Charlotte", "Amelia", "Sophia", "Isabella", "Ava", "Mia", "Evelyn", "Luna",
            "Gabriel", "Julian", "Ethan", "Daniel", "Alexander", "Samuel", "Sebastian", "Jack", "Aiden", "Owen",
            "Harper", "Camila", "Gianna", "Abigail", "Ella", "Scarlett", "Emily", "Aria", "Chloe", "Penelope"
        ]
        last_names = [
            "Dela Cruz", "Santos", "Reyes", "Bautista", "Aquino", "Garcia", "Ramos", "Mendoza", "Flores", "Villanueva",
            "Gonzales", "Castillo", "Torres", "Navarro", "Rivera", "Morales", "Perez", "Soriano", "De Leon", "Pascual",
            "Domingo", "Mercado", "Tan", "Lim", "Sarmiento", "Guerrero", "Salazar", "Valdez", "Miranda", "Padilla",
            "Castro", "Tolentino", "Estrada", "Santiago", "Bernardo", "Robles", "Pineda", "Guzman", "Cortez", "Aguilar"
        ]

        created_students = []
        for i in range(40):
            s_num = f"2026-{10001 + i}"
            fn = first_names[i]
            ln = last_names[i]
            # split between sec_bscs_1a and sec_bscs_2a
            assigned_sec = sec_bscs_1a if i < 25 else sec_bscs_2a
            assigned_prog = bscs
            assigned_year = 1 if i < 25 else 2

            std = Student(
                student_number=s_num,
                first_name=fn,
                middle_name="A.",
                last_name=ln,
                email=f"{fn.lower()}.{ln.lower().replace(' ', '')}@student.school.lan",
                gender="Male" if i % 2 == 0 else "Female",
                program_id=assigned_prog.id,
                year_level=assigned_year,
                current_section_id=assigned_sec.id,
                status="active",
            )
            created_students.append(std)
            db.add(std)
        db.flush()

        # 10. Enrollments
        # Enroll first 25 students into offering 1 (CS101 - BSCS 1-A)
        # Enroll remaining 15 students into offering 2 (CS102 - BSCS 2-A)
        offering1_enrollments = []
        for std in created_students[:25]:
            enr = Enrollment(
                student_id=std.id,
                class_offering_id=offering1.id,
                enrollment_date=date(2026, 8, 5),
                status="enrolled",
            )
            offering1_enrollments.append(enr)
            db.add(enr)

        for std in created_students[25:]:
            enr = Enrollment(
                student_id=std.id,
                class_offering_id=offering2.id,
                enrollment_date=date(2026, 8, 5),
                status="enrolled",
            )
            db.add(enr)
        db.flush()

        # 11. Past Class Meeting & Attendance Records for Offering 1
        meeting_past = ClassMeeting(
            class_offering_id=offering1.id,
            meeting_date=date(2026, 10, 5),
            start_time=time(9, 0),
            end_time=time(10, 0),
            status="submitted",
            scheduled_by_id=instructor1.id,
            submitted_by_id=instructor1.id,
            submitted_at=datetime.now(timezone.utc) - timedelta(days=6),
            notes="Regular lecture: Introduction to Computer Architecture.",
        )
        db.add(meeting_past)
        db.flush()

        # Record attendance for the 25 enrolled students in this past meeting:
        # 21 Present, 2 Late, 1 Absent, 1 Excused
        for idx, enr in enumerate(offering1_enrollments):
            if idx == 0:
                att_status = "absent"
                rem = "Unexcused absence"
            elif idx == 1:
                att_status = "excused"
                rem = "Medical appointment pass submitted"
            elif idx in [2, 3]:
                att_status = "late"
                rem = "Arrived 15 minutes late"
            else:
                att_status = "present"
                rem = None

            att_rec = AttendanceRecord(
                class_meeting_id=meeting_past.id,
                enrollment_id=enr.id,
                status=att_status,
                remarks=rem,
                recorded_by_id=instructor1.id,
                recorded_at=datetime.now(timezone.utc) - timedelta(days=6),
            )
            db.add(att_rec)

        # 12. Initial Audit Log Entry
        audit = AuditLog(
            user_id=admin_user.id,
            action="SYSTEM_INIT",
            entity_type="system",
            entity_id=None,
            ip_address="127.0.0.1",
            user_agent="CampusAttend Seed Script",
            old_values=None,
            new_values={"status": "initial_seed_completed"},
            timestamp=datetime.now(timezone.utc),
        )
        db.add(audit)

        db.commit()
        print("[+] Database successfully seeded with accounts, courses, and 40 students!")

    except Exception as e:
        db.rollback()
        print(f"[-] Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
