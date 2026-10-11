# CampusAttend: Server-Enforced Role-Based Access Control (RBAC) Matrix

## 1. Principles of Authorization
1. **Server-Side Enforcement:** Every endpoint checks role and contextual resource ownership (e.g., verifying an instructor is assigned to the requested class offering). Hiding UI elements is merely cosmetic and never considered a security control.
2. **Principle of Least Privilege:** Users receive only the minimum permissions necessary for their duties.
3. **Contextual Class-Assignment Guard:** An instructor with general "Record Attendance" permission cannot record or view attendance for classes taught by another instructor.

---

## 2. Comprehensive Role-Permission Matrix

| Action / Capability | Administrator | Instructor | Department Head | Registrar |
|---|:---:|:---:|:---:|:---:|
| **Authentication & Profile** |
| Login / Logout | ✅ | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ | ✅ |
| Reset Other Users' Passwords | ✅ | ❌ | ❌ | ❌ |
| Create / Edit / Deactivate User Accounts | ✅ | ❌ | ❌ | ❌ |
| **Student Management** |
| View Student Directory & Profiles | ✅ | ❌ (Roster only) | ✅ (Dept only) | ✅ |
| Add / Edit Student Records | ✅ | ❌ | ❌ | ✅ |
| Bulk Import Students via CSV | ✅ | ❌ | ❌ | ✅ |
| Archive / Deactivate Student Records | ✅ | ❌ | ❌ | ✅ |
| **Academic Structure & Scheduling** |
| Manage Terms, Depts, Programs, Subjects | ✅ | ❌ | ❌ | ❌ |
| Manage Sections & Section Enrollment | ✅ | ❌ | ❌ | ✅ |
| Create Class Offerings & Assign Instructors | ✅ | ❌ | ❌ | ❌ |
| Define Class Timetable & Room Schedules | ✅ | ❌ | ❌ | ❌ |
| Manage Student Class Enrollments | ✅ | ❌ | ❌ | ✅ |
| **Class Meetings & Attendance** |
| View Assigned Classes & Rosters | ✅ | ✅ (Own classes) | ✅ (Dept classes) | ❌ |
| Open Class Meeting Session | ✅ | ✅ (Own classes) | ❌ | ❌ |
| Record & Submit Draft Attendance | ✅ | ✅ (Own classes) | ❌ | ❌ |
| Directly Edit Submitted Attendance | ✅ (Logged) | ❌ | ❌ | ❌ |
| Submit Correction Request | ❌ | ✅ (Own classes) | ❌ | ❌ |
| Review & Approve Correction Request | ✅ | ❌ | ✅ (Dept classes) | ❌ |
| **Reports & Analytics** |
| Daily Class Attendance Sheets | ✅ | ✅ (Own classes) | ✅ (Dept classes) | ✅ |
| Student Attendance Transcript | ✅ | ❌ | ✅ (Dept students)| ✅ |
| Subject & Section Aggregated Reports | ✅ | ✅ (Own classes) | ✅ (Dept classes) | ✅ |
| Semester Institutional Attendance Reports | ✅ | ❌ | ✅ (Dept classes) | ✅ |
| Incomplete / Unsubmitted Attendance Report| ✅ | ❌ | ✅ (Dept classes) | ❌ |
| Export Reports to CSV / Printable PDF | ✅ | ✅ (Own classes) | ✅ (Dept classes) | ✅ |
| **Audit Logs & Maintenance** |
| View Security & System Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Execute Database Backups & Restores | ✅ | ❌ | ❌ | ❌ |
| Trigger Manual System Backup | ✅ | ❌ | ❌ | ❌ |
