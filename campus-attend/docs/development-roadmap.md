# CampusAttend: Phased Development Roadmap

## Phase Breakdown & Milestone Schedule

```mermaid
gantt
    title CampusAttend Phased Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Specification
    Phase 1: Architecture & Requirements           :done,    p1, 2026-10-11, 2d
    section Core Infrastructure
    Phase 2: Database Schema & Migrations          :active,  p2, after p1, 3d
    Phase 3: Authentication & RBAC Engine          :         p3, after p2, 3d
    section Domain Modules
    Phase 4: Academic & Student Management         :         p4, after p3, 4d
    Phase 5: Manual Attendance Workflow            :         p5, after p4, 4d
    Phase 6: Reporting Engine & Exports            :         p6, after p5, 3d
    section Hardening & Testing
    Phase 7: Audit Trails & Backup Automation      :         p7, after p6, 2d
    Phase 8: Automated & Load Testing              :         p8, after p7, 3d
    section Production Readiness
    Phase 9: LAN Offline Deployment & Nginx        :         p9, after p8, 2d
    Phase 10: Pilot Deployment & Handover Docs     :         p10, after p9, 2d
```

---

## Detailed Phase Execution Plan

### Phase 1: Requirements, Architecture, and UI Design (Current Milestone)
- **Deliverables:** System requirements, architecture diagram, ER diagram, role-permission matrix, frontend sitemap, API specification, security/privacy plan, and development roadmap.
- **Verification Gate:** Formal review of architecture, data constraints, offline assumptions, and approval of institutional parameters.

### Phase 2: Database Schema and Migrations
- **Deliverables:**
  - Complete SQLAlchemy 2.0 async/sync models for all 14 entities.
  - Alembic migration environment and initial migration script.
  - Synthetic seed data generator for development and testing (2 terms, 4 departments, 8 programs, 20 subjects, 100 students, 10 class offerings).
- **Verification Gate:** Successful execution of `alembic upgrade head`, foreign key validation, and seed data verification via pytest.

### Phase 3: Authentication and Authorization
- **Deliverables:**
  - Password hashing service using Argon2id.
  - Session manager issuing `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
  - FastAPI dependency injection guards (`get_current_user`, `require_role`, `verify_class_instructor`).
  - Login rate limiter and session invalidation.
- **Verification Gate:** Automated pytest suite covering valid login, invalid login, rate limiting, and permission denial.

### Phase 4: Student, Academic, and Enrollment Management
- **Deliverables:**
  - Academic hierarchy CRUD endpoints (Terms, Departments, Programs, Subjects, Sections).
  - Class offering and timetable schedule management with conflict detection.
  - Student CRUD and enrollment endpoints with duplicate enrollment prevention.
  - CSV bulk student import engine with dry-run validation preview and error logging.
  - Frontend management views for students, sections, and offerings.
- **Verification Gate:** Automated tests for duplicate enrollment prevention, timetable conflict detection, and malformed CSV handling.

### Phase 5: Manual Attendance Workflow
- **Deliverables:**
  - Class meeting management (`draft`, `submitted`, `closed`).
  - Attendance recording engine with atomic transaction and row locking.
  - Frontend classroom attendance roster: "Mark All Present", quick status chips (`P`, `L`, `A`, `E`), confirmation summary dialog.
  - Attendance correction request and approval workflow.
- **Verification Gate:** End-to-end tests verifying atomic submission, duplicate attendance prevention, and instructor class isolation.

### Phase 6: Reports, CSV Import, and Exports
- **Deliverables:**
  - Daily class attendance report generator.
  - Student cumulative attendance transcript.
  - Section, subject, and semester aggregated reports with accurate percentage formulas.
  - Incomplete attendance tracking report.
  - CSV and printable PDF export engine running 100% locally.
- **Verification Gate:** Unit tests verifying mathematical correctness of attendance percentages and PDF export generation.

### Phase 7: Audit Logs, Security Hardening, and Backup Automation
- **Deliverables:**
  - Append-only audit logging listener for all sensitive mutations.
  - Security headers middleware (CSP, X-Frame-Options, X-Content-Type-Options).
  - Automated `pg_dump` backup scripts with 7-day rotation and restoration verification script.
- **Verification Gate:** Verification of immutable audit log generation and test restore of backup dump.

### Phase 8: Automated Testing and Performance Validation
- **Deliverables:**
  - Pytest suite covering >85% backend code paths.
  - Vitest + React Testing Library component tests.
  - Playwright E2E tests for the instructor attendance workflow.
  - Locust load testing script simulating 50 concurrent instructors.
- **Verification Gate:** All test suites green; Locust report confirming p95 response time <2s under target load.

### Phase 9: LAN Deployment and Offline Testing
- **Deliverables:**
  - Nginx configuration with TLS and static SPA routing.
  - Systemd service units for FastAPI/Uvicorn.
  - Self-signed/internal CA setup script for school devices.
  - Verification checklist for physical network disconnection from the internet.
- **Verification Gate:** Full system operation tested with WAN cable physically unplugged.

### Phase 10: Pilot Deployment and Documentation
- **Deliverables:**
  - Complete README, Administrator manual, and Instructor user guide.
  - Troubleshooting guide for LAN DNS and browser certificate installation.
  - Final project signoff.
