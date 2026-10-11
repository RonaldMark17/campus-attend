# CampusAttend: Frontend Pages, Navigation & UI/UX Plan

## 1. Application Layout Architecture

The frontend is structured as a Single-Page Application (SPA) with two primary layouts:
1. **Public Layout:** Minimalist, high-focus container for authentication (`/login`).
2. **Authenticated App Layout:** Responsive sidebar navigation, top application bar (with active academic term indicator, current user identity, server status indicator), main content canvas, and accessible modal dialogs.

---

## 2. Sitemap & Route Hierarchy

```
/
├── login                                   [Public] User authentication
├── dashboard                               [Protected: All] Role-tailored operational overview
├── students                                [Protected: Admin, Registrar, Dept Head]
│   ├── index                               Searchable, paginated student directory
│   ├── new                                 Add individual student profile
│   ├── :studentId                          View & edit student details, enrollment history
│   └── import                              CSV bulk student import & validation preview
├── academics                               [Protected: Admin, Registrar]
│   ├── terms                               Academic years and semester terms
│   ├── departments                         Departments and academic divisions
│   ├── programs                            Degree programs and curricula
│   ├── subjects                            Subject course catalog & credit units
│   ├── sections                            Class sections and student block assignments
│   └── offerings                           Class offerings & instructor assignments
├── timetable                               [Protected: Admin, Registrar, Dept Head]
│   └── schedules                           Timetable view & schedule conflict detector
├── classes                                 [Protected: Instructor]
│   ├── index                               Instructor's assigned classes for active term
│   └── :offeringId                         Class overview, enrolled roster, meeting history
├── attendance                              [Protected: Instructor, Admin]
│   ├── take/:offeringId/:meetingDate       Live manual attendance recording interface
│   ├── session/:meetingId                  View submitted attendance session
│   └── corrections                         Correction requests inbox & review queue
├── reports                                 [Protected: All roles, scoped by role]
│   ├── daily                               Daily class attendance sheets
│   ├── student                             Individual student cumulative attendance transcripts
│   ├── subject                             Subject & section performance breakdown
│   ├── semester                            Full semester institutional/departmental summary
│   └── incomplete                          Missing/unrecorded attendance sessions tracker
├── audit-logs                              [Protected: Admin]
│   └── index                               System security events and data audit stream
├── users                                   [Protected: Admin]
│   ├── index                               User account list & role assignments
│   └── new                                 Provision new instructor or staff account
└── settings                                [Protected: Admin]
    └── system                              Server health, offline status, backup management
```

---

## 3. Instructor Attendance UI Design & Workflow Specification

The manual attendance interface (`/attendance/take/:offeringId/:meetingDate`) is optimized for rapid entry under real classroom conditions:

1. **Header Sticky Bar:**
   - Subject code & section name (e.g., `CS101 - BSCS 1-A`).
   - Scheduled time & meeting date.
   - Real-time tally: `Total: 45 | Present: 40 | Late: 2 | Absent: 2 | Excused: 1 | Unmarked: 0`.
   - "Mark All Present" batch action button.
   - "Submit Attendance" primary action button (disabled if any student remains unrecorded).

2. **Roster Table / Mobile Card View:**
   - Large touch targets for tablets and mobile phones.
   - Columns: Student ID, Full Name, Status Selector (Segmented buttons: `[P]`, `[L]`, `[A]`, `[E]`), Remarks input.
   - Statuses use distinct colors AND visible text labels + icons (accessible for color blindness).
     - **Present:** Emerald Green (`check-circle`)
     - **Late:** Amber Orange (`clock`)
     - **Absent:** Rose Red (`x-circle`)
     - **Excused:** Blue / Indigo (`shield-check`)

3. **Pre-Submission Review & Confirmation:**
   - Submitting prompts a confirmation modal summarizing all exceptions (`Absent: 2`, `Late: 2`).
   - Prevents accidental submission while allowing instructors to spot mistakes immediately.
   - Displays animated progress and awaits HTTP 200/201 response before marking UI state as `Submitted`.
   - Network failure handler: If offline or Wi-Fi drops, displays an amber retry banner and retains entered status selections in component state without data loss.
