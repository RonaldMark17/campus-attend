# CampusAttend: System Administrator & Registrar Manual

## 1. System Overview
CampusAttend is an on-premise, offline-first attendance management platform designed specifically for college environments (>1,500 students) operating over an authorized local area network (LAN).

---

## 2. Default Administrative Credentials
Upon initial database seeding, the following default accounts are provisioned:
- **System Administrator:** `admin` / `admin123`
- **Department Head:** `depthead` / `password123`
- **College Registrar:** `registrar` / `password123`
- **Lead Instructors:** `instructor1`, `instructor2` / `password123`

> **Security Advisory:** The System Administrator should change default passwords immediately after initial deployment.

---

## 3. Student Enrollment & CSV Onboarding

### 3.1 Adding Students Individually
1. Navigate to the **Students** tab in the top navigation bar.
2. Click the **"Add Student"** button.
3. Fill in the required fields:
   - Student Number (e.g., `2026-00041`)
   - First Name & Last Name
   - Email address (`@school.lan` or personal email)
   - Academic Program (e.g., BS Computer Science)
   - Year Level (1 to 5)
4. Click **"Save Student"**.

### 3.2 Bulk CSV Roster Import
1. Navigate to **Students** -> **"Import Students via CSV"**.
2. Select your CSV file containing headers: `student_number,first_name,last_name,email,program_code,year_level,gender`.
3. Click **"Validate CSV (Dry Run)"**.
4. The system validates student number uniqueness, email formats, and program codes without modifying the database.
5. Review the validation summary. If valid, click **"Commit Import to Database"**.

---

## 4. Academic Catalog & Offerings
Under the **Academics** tab:
- **Terms:** Define active academic semesters (e.g., `1st Semester AY 2026-2027`).
- **Programs & Subjects:** Manage courses, lecture units, and laboratory units.
- **Class Offerings & Sections:** Assign instructors to course sections. The conflict simulator prevents scheduling double-bookings for classrooms or instructors.

---

## 5. Attendance Correction Reviews (Dept Heads & Admins)
When faculty members submit roll calls, the session locks to prevent accidental alteration. If a student later presents an official medical certificate or excused absence slip:
1. Navigate to the **Corrections** tab.
2. Filter by **"Pending Review"**.
3. Inspect the student name, original status (`absent`), requested status (`excused`), and instructor's justification.
4. Click **"Approve"** or **"Reject"**.
5. Enter an official audit justification note (e.g., `Medical certificate verified from University Health Services`).
6. Click **Confirm Decision**. The database updates transactionally and an immutable audit record is logged.

---

## 6. Audit Logs & Data Privacy (RA 10173) Compliance
Under the Philippine Data Privacy Act of 2012 (RA 10173), student attendance records and administrative overrides are classified as sensitive student educational records.
- All actions (logins, logouts, batch roster submissions, correction approvals, student record modifications) are logged permanently in the `audit_logs` table.
- System Administrators can download the compliance log at any time via:
  `GET /api/v1/audit-logs/export-csv`.
