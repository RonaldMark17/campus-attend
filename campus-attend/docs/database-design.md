# CampusAttend: Database Schema & Entity-Relationship Design

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ class_offerings : "instructs"
    users ||--o{ audit_logs : "triggers"
    users ||--o{ class_meetings : "submits"
    users ||--o{ attendance_correction_requests : "requests/reviews"

    departments ||--o{ programs : "administers"
    departments ||--o{ subjects : "owns"

    programs ||--o{ students : "enrolls"
    programs ||--o{ sections : "has"

    academic_terms ||--o{ sections : "schedules"
    academic_terms ||--o{ class_offerings : "offers"

    subjects ||--o{ class_offerings : "instantiates"
    sections ||--o{ class_offerings : "attends"

    students ||--o{ enrollments : "registers"
    class_offerings ||--o{ enrollments : "contains"
    class_offerings ||--o{ class_schedules : "meets_on"
    class_offerings ||--o{ class_meetings : "holds"

    enrollments ||--o{ attendance_records : "graded_for"
    class_meetings ||--o{ attendance_records : "records"

    attendance_records ||--o{ attendance_correction_requests : "subject_to"

    users {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar hashed_password
        varchar full_name
        varchar role "admin, instructor, dept_head, registrar"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    departments {
        uuid id PK
        varchar code UK
        varchar name
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    programs {
        uuid id PK
        uuid department_id FK
        varchar code UK
        varchar name
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    academic_terms {
        uuid id PK
        varchar code UK
        varchar name
        date start_date
        date end_date
        boolean is_current
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    sections {
        uuid id PK
        uuid program_id FK
        uuid academic_term_id FK
        int year_level
        varchar name
        timestamp created_at
        timestamp updated_at
    }

    subjects {
        uuid id PK
        uuid department_id FK
        varchar code UK
        varchar title
        numeric units
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    students {
        uuid id PK
        varchar student_number UK
        varchar first_name
        varchar middle_name
        varchar last_name
        varchar suffix
        varchar email UK
        varchar gender
        uuid program_id FK
        int year_level
        uuid current_section_id FK
        varchar status "active, inactive, graduated, dropped"
        timestamp created_at
        timestamp updated_at
    }

    class_offerings {
        uuid id PK
        uuid academic_term_id FK
        uuid subject_id FK
        uuid section_id FK
        uuid instructor_id FK
        varchar room
        varchar status "active, completed, cancelled"
        timestamp created_at
        timestamp updated_at
    }

    class_schedules {
        uuid id PK
        uuid class_offering_id FK
        int day_of_week "0=Sun, 1=Mon, ..., 6=Sat"
        time start_time
        time end_time
        varchar room
        timestamp created_at
        timestamp updated_at
    }

    enrollments {
        uuid id PK
        uuid student_id FK
        uuid class_offering_id FK
        date enrollment_date
        varchar status "enrolled, dropped, withdrawn"
        timestamp created_at
        timestamp updated_at
    }

    class_meetings {
        uuid id PK
        uuid class_offering_id FK
        date meeting_date
        time start_time
        time end_time
        varchar status "draft, submitted, closed"
        uuid scheduled_by_id FK
        uuid submitted_by_id FK
        timestamp submitted_at
        text notes
        timestamp created_at
        timestamp updated_at
    }

    attendance_records {
        uuid id PK
        uuid class_meeting_id FK
        uuid enrollment_id FK
        varchar status "present, absent, late, excused"
        text remarks
        timestamp recorded_at
        uuid recorded_by_id FK
        timestamp updated_at
    }

    attendance_correction_requests {
        uuid id PK
        uuid attendance_record_id FK
        uuid requested_by_id FK
        varchar requested_status "present, absent, late, excused"
        text reason
        uuid reviewed_by_id FK
        varchar review_status "pending, approved, rejected"
        text review_notes
        timestamp reviewed_at
        timestamp created_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        varchar ip_address
        text user_agent
        jsonb old_values
        jsonb new_values
        timestamp timestamp
    }
```

---

## 2. Table Schemas, Constraints & Business Rules

### 2.1 Table: `users`
- Stores system accounts.
- **Constraints:**
  - `username` UNIQUE NOT NULL
  - `email` UNIQUE NOT NULL
  - `role` CHECK (`role IN ('admin', 'instructor', 'dept_head', 'registrar')`)
- **Retention:** `is_active=false` prevents authentication while preserving relational integrity with past class meetings and audit logs.

### 2.2 Table: `students`
- Master directory of enrolled students.
- **Constraints:**
  - `student_number` UNIQUE NOT NULL (e.g., `2024-00123`).
  - `status` CHECK (`status IN ('active', 'inactive', 'graduated', 'dropped')`).
  - Foreign key to `programs(id)` (ON DELETE RESTRICT).
  - Foreign key to `sections(id)` (ON DELETE SET NULL).
- **Index:** `CREATE INDEX idx_students_search ON students (student_number, last_name, first_name);`

### 2.3 Table: `enrollments`
- Binds a student to a class offering.
- **Critical Constraint:** 
  - `UNIQUE(student_id, class_offering_id)`: A student cannot be enrolled in the same class offering more than once.
  - `status` CHECK (`status IN ('enrolled', 'dropped', 'withdrawn')`).
- **Referential Integrity:** `ON DELETE RESTRICT` on both `student_id` and `class_offering_id`. Historical enrollments must never be hard-deleted if attendance records exist.

### 2.4 Table: `class_meetings`
- Represents a specific session of a class offering on a calendar date.
- **Critical Constraint:**
  - `UNIQUE(class_offering_id, meeting_date)`: Only one meeting record per class offering per calendar date (unless schedule supports split labs, in which case unique by offering + date + start_time).
  - `status` CHECK (`status IN ('draft', 'submitted', 'closed')`).
- **Index:** `CREATE INDEX idx_meetings_offering_date ON class_meetings(class_offering_id, meeting_date);`

### 2.5 Table: `attendance_records`
- Individual attendance entries per student per class meeting.
- **Critical Constraints:**
  - `UNIQUE(class_meeting_id, enrollment_id)`: Guarantees exactly one attendance record per enrolled student per class meeting. Duplicate attendance records are impossible at the database level.
  - `status` CHECK (`status IN ('present', 'absent', 'late', 'excused')`).
- **Validation Rule:** Before inserting an attendance record, the application confirms via transaction that `enrollment.class_offering_id == class_meeting.class_offering_id`.
- **Index:** `CREATE INDEX idx_attendance_records_meeting ON attendance_records(class_meeting_id);`
- **Index:** `CREATE INDEX idx_attendance_records_enrollment ON attendance_records(enrollment_id, status);`

### 2.6 Table: `attendance_correction_requests`
- Manages formal requests by instructors to correct submitted attendance.
- **Constraints:**
  - `requested_status` CHECK (`requested_status IN ('present', 'absent', 'late', 'excused')`).
  - `review_status` CHECK (`review_status IN ('pending', 'approved', 'rejected')`).
  - Foreign key to `attendance_records(id)`.
  - When approved, updates `attendance_records.status` and logs an entry in `audit_logs`.

### 2.7 Table: `audit_logs`
- Immutable event stream of security and data mutations.
- **Characteristics:**
  - Append-only. No `UPDATE` or `DELETE` operations permitted via application endpoints.
  - Stores `old_values` and `new_values` as PostgreSQL `JSONB` for deep structural diffs.
- **Index:** `CREATE INDEX idx_audit_logs_user_ts ON audit_logs(user_id, timestamp DESC);`
- **Index:** `CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);`
