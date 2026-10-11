# CampusAttend: School-Network-Only College Attendance Management System

CampusAttend is an on-premises, secure, and resilient web-based attendance management platform built for colleges and universities with 1,500+ students. It is designed from the ground up to operate exclusively on the school's local area network (LAN/Wi-Fi) without any dependency on the public internet, external CDNs, or cloud authentication providers.

---

## Architecture at a Glance

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons (100% offline-bundled SPA).
- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2, Argon2id password hashing, Uvicorn.
- **Database:** PostgreSQL 16 with normalized ACID schema, strict unique constraints, and foreign key cascades/restricts.
- **Reverse Proxy & TLS:** Nginx over HTTPS (Port 443) proxying to FastAPI loopback (127.0.0.1:8000), internal Root CA certificate.
- **Auditing & Compliance:** Immutable append-only audit trail compliant with the Philippine Data Privacy Act of 2012 (RA 10173).

---

## Project Structure

```
campus-attend/
├── frontend/               # React + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/     # Accessible UI components (tables, badges, modal dialogs)
│   │   ├── pages/          # Application views (Dashboard, Attendance, Reports, etc.)
│   │   ├── layouts/        # App Layout and Auth Layout
│   │   ├── hooks/          # Custom React hooks (useAuth, useAttendance)
│   │   ├── services/       # Offline-safe API client wrappers
│   │   └── types/          # TypeScript domain models and API schemas
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── api/routes/     # REST route handlers (/auth, /students, /attendance, etc.)
│   │   ├── core/           # Security, config, database connection pool, session engine
│   │   ├── models/         # SQLAlchemy 2.0 database models
│   │   ├── schemas/        # Pydantic request and response schemas
│   │   ├── services/       # Business logic (attendance engine, report generator)
│   │   ├── permissions/    # Server-enforced role and ownership guards
│   │   └── main.py         # Application entry point
│   ├── migrations/         # Alembic database migration scripts
│   └── tests/              # Pytest automated test suites
├── deployment/             # On-premises production configurations
│   ├── nginx/              # Nginx virtual host configurations with TLS and proxying
│   ├── systemd/            # systemd service unit files for automated startup
│   └── scripts/            # Database backup, restore, and internal CA generation scripts
└── docs/                   # Architectural & technical documentation
    ├── requirements.md     # System Requirements Specification
    ├── architecture.md     # Network topology and 3-tier architecture
    ├── database-design.md  # Relational ER diagram, schemas, and constraints
    ├── role-permission-matrix.md # Server-side RBAC security matrix
    ├── frontend-navigation.md    # UI/UX specification, routes, and workflows
    ├── api-specification.md      # REST API v1 endpoints
    ├── security-offline-plan.md  # Encryption, privacy (RA 10173), and offline plan
    ├── development-roadmap.md    # 10-phase milestone roadmap
    └── assumptions-and-decisions.md # Policy questions requiring school approval
```

---

## Phase Status

- **Phase 1: Requirements, Architecture, and UI Design:** Completed ✅
- **Phase 2: Database Schema and Migrations:** Next milestone ⏳
- **Phase 3: Authentication and Authorization:** Pending ⏳
- **Phase 4: Student, Academic, and Enrollment Management:** Pending ⏳
- **Phase 5: Manual Attendance Workflow:** Pending ⏳
- **Phase 6: Reports, CSV Import, and Exports:** Pending ⏳
- **Phase 7: Audit Logs, Security Hardening, and Backup Automation:** Pending ⏳
- **Phase 8: Automated Testing and Performance Validation:** Pending ⏳
- **Phase 9: LAN Deployment and Offline Testing:** Pending ⏳
- **Phase 10: Pilot Deployment and Documentation:** Pending ⏳
