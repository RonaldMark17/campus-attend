# CampusAttend: System Requirements Specification (SRS)

## 1. Project Overview & Scope
**CampusAttend** is an on-premises, school-network-only College Attendance Management System designed for higher education institutions serving over 1,500 students. The application operates in a completely air-gapped or offline LAN environment without dependencies on external cloud providers, third-party authentication services, external CDNs, or an active internet connection.

### Core Objectives
1. **Offline & LAN Operation:** Run entirely on the school's local area network (Wi-Fi and wired Ethernet) hosted on an on-premises school server.
2. **High Capacity & Performance:** Reliably handle 1,500+ active students, 50+ concurrent instructors, class rosters of 30–60 students, and peak concurrent attendance submissions at period changeovers.
3. **Accuracy & Fraud Prevention:** Eliminate student name ambiguity by strictly binding attendance to database-enforced unique student IDs and class offering enrollments.
4. **Data Privacy & Compliance:** Fully align with the Philippine Data Privacy Act of 2012 (RA 10173), ensuring role-based access, strict audit logging, and local data residency.

---

## 2. Stakeholders & User Roles

| Role | Description | Primary Responsibilities |
|---|---|---|
| **Administrator** | Central IT & Academic Systems Officer | User account management, academic calendar configuration, student records, audit inspection, system backups, master overrides. |
| **Instructor** | Faculty Member / Lecturer | View assigned class schedules & rosters, open class sessions, take and submit attendance, submit correction requests for closed sessions. |
| **Department Head (Dean / Chair)** | Academic Unit Head | Monitor department-wide attendance compliance, review unrecorded sessions, approve/reject attendance correction requests. |
| **Registrar** | Institutional Records Officer | Manage official student profiles, validate curriculum/program enrollments, generate official semester attendance transcripts. |

---

## 3. Functional Requirements

### 3.1 Authentication & Session Management
- **FR-AUTH-1:** Internal credential login using username/email and password hashed with Argon2id.
- **FR-AUTH-2:** Session tokens delivered exclusively via `HttpOnly`, `SameSite=Lax` (or `Strict`), `Secure` cookies. No JWTs or role claims stored in browser `localStorage`.
- **FR-AUTH-3:** Sliding session timeout (e.g., 60 minutes inactivity) and absolute session expiration.
- **FR-AUTH-4:** In-memory or database-backed rate limiting on `/api/v1/auth/login` to prevent brute-force attacks over the LAN.
- **FR-AUTH-5:** Current authenticated user profile endpoint (`/api/v1/auth/me`) returning verified server-side role and permissions.

### 3.2 Academic Structure & Curriculum Management
- **FR-ACAD-1:** Hierarchical data model: Academic Terms (Year + Semester) -> Departments -> Programs (Degree Courses) -> Subjects (Course Codes + Units) -> Sections (Year Level + Block).
- **FR-ACAD-2:** Class Offerings linking a specific Subject, Section, Academic Term, assigned Instructor, and Room.
- **FR-ACAD-3:** Timetable scheduling for Class Offerings (Day of week, Start time, End time, Room) with server-side schedule conflict detection.
- **FR-ACAD-4:** Preservation of historical offerings and grades when terms conclude; zero cascading deletion of historical data.

### 3.3 Student & Enrollment Management
- **FR-STUD-1:** Unique Student Number requirement (alphanumeric, institution format, e.g., `2024-10023`).
- **FR-STUD-2:** Student profile fields: First Name, Middle Name, Last Name, Suffix, Email, Program, Year Level, Current Section, Status (`active`, `inactive`, `graduated`, `dropped`).
- **FR-STUD-3:** Class enrollment explicitly linking a `student_id` to a `class_offering_id` with a database unique constraint preventing duplicate active enrollments.
- **FR-STUD-4:** Bulk CSV Import engine for student rosters with dry-run preview, row-by-row syntax/referential validation, and downloadable error reporting before commit.

### 3.4 Manual Attendance Workflow
- **FR-ATT-1:** Instructor roster access restricted strictly to their assigned `class_offerings`.
- **FR-ATT-2:** Class Meeting initiation: opens a meeting for a scheduled date/time slot in `draft` status.
- **FR-ATT-3:** Fast roster marking: 
  - One-click "Mark All Present" baseline.
  - Granular exception toggling: `Present`, `Absent`, `Late`, `Excused`.
  - Optional per-student remarks (e.g., "Arrived 20 mins late with medical pass").
- **FR-ATT-4:** Atomic transactional submission: Transitions meeting status to `submitted`. Writes all roster entries in a single database transaction.
- **FR-ATT-5:** Anti-tampering & Locks: Once `submitted` or `closed`, direct edits by instructors are blocked. Corrections require a formal correction request with stated reason, audited and subject to Department Head or Admin approval.

### 3.5 Attendance Reporting & Analytics
- **FR-REP-1:** Daily class attendance summary sheet with totals and percentages.
- **FR-REP-2:** Cumulative student attendance ledger displaying breakdown of Present, Absent, Late, Excused across all enrolled subjects.
- **FR-REP-3:** Section and Program attendance summaries for department chairs.
- **FR-REP-4:** Incomplete / Missing Attendance Tracker identifying instructors or meetings that have not submitted attendance within 24 hours of scheduled meeting time.
- **FR-REP-5:** Direct exports to CSV and browser-printable PDF formats generated without external cloud APIs.

### 3.6 Audit Logging & Security
- **FR-AUD-1:** Append-only audit log table capturing timestamp, acting `user_id`, client IP address, action code, target entity, old state, and new state.
- **FR-AUD-2:** Audit trails required for: logins/logouts, attendance submissions, attendance status corrections, student record alterations, and user permission changes.

---

## 4. Non-Functional Requirements

### 4.1 LAN & Offline Integrity
- **NFR-LAN-1:** Zero internet connectivity required. No runtime dependencies on public CDNs (fonts, scripts, icons, CSS). All assets bundled locally into the Vite production build.
- **NFR-LAN-2:** Compatible with internal private IP addressing (e.g., `192.168.10.0/24`) and local DNS hostname resolution (e.g., `attendance.school.lan`).
- **NFR-LAN-3:** HTTPS encryption powered by an internal School Certificate Authority (CA) or private trusted certificate.

### 4.2 Performance & Scalability
- **NFR-PERF-1:** Dashboard load: < 2.0s at p95 under 50 concurrent active users.
- **NFR-PERF-2:** Class roster display (60 students): < 1.0s at p95.
- **NFR-PERF-3:** Attendance batch submission: < 2.5s at p95.
- **NFR-PERF-4:** Student keyword search (across 2,500+ records): < 800ms.
- **NFR-PERF-5:** Full-term report generation: < 5.0s.

### 4.3 Reliability & Disaster Recovery
- **NFR-REL-1:** Database ACID compliance with PostgreSQL WAL (Write-Ahead Logging).
- **NFR-REL-2:** Daily automated compressed database backups (`pg_dump`) rotated on a 7-day retention schedule.
- **NFR-REL-3:** Uninterruptible Power Supply (UPS) graceful shutdown plan for on-premises server.
