# CampusAttend: REST API Specification (v1)

## 1. Overview & Conventions
- **Base URI:** `/api/v1`
- **Data Format:** JSON (`application/json`) for request bodies and API responses. Multipart/form-data for CSV uploads.
- **Authentication:** Cookie-based session (`campusattend_session`). Set via `Set-Cookie` with `HttpOnly`, `SameSite=Lax`, `Secure`.
- **Response Format:**
  - Standard Success: `{ "success": true, "data": ... }` or raw model representations.
  - Standard Error: `{ "detail": "Human-readable explanation of error", "code": "ERROR_CODE" }`
- **Pagination:** Standard query parameters `?page=1&page_size=50` returning:
  `{ "items": [...], "total": 1540, "page": 1, "page_size": 50, "total_pages": 31 }`

---

## 2. API Endpoints by Domain

### 2.1 Authentication & Profile (`/api/v1/auth`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/auth/login` | Authenticate credentials & issue session cookie | Public |
| `POST` | `/auth/logout` | Invalidate server session & clear cookie | Authenticated |
| `GET` | `/auth/me` | Fetch active user profile, role, and permissions | Authenticated |
| `POST` | `/auth/change-password` | Update current user's password | Authenticated |
| `POST` | `/auth/reset-password/{user_id}`| Administrator-initiated password reset | Admin |

### 2.2 Student Management (`/api/v1/students`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET` | `/students` | Paginated student list with search & filter | Admin, Registrar, Dept Head |
| `POST` | `/students` | Register a new student profile | Admin, Registrar |
| `GET` | `/students/{id}` | Retrieve student profile and enrollment history | Admin, Registrar, Dept Head |
| `PUT` | `/students/{id}` | Update student profile information | Admin, Registrar |
| `DELETE`| `/students/{id}` | Archive student (set status to inactive) | Admin, Registrar |
| `POST` | `/students/import/preview` | Dry-run parse CSV, return row validations | Admin, Registrar |
| `POST` | `/students/import/commit` | Commit validated student CSV records | Admin, Registrar |

### 2.3 Academic Structure (`/api/v1/academics`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET`/`POST` | `/academics/terms` | List / Create academic terms (years/semesters) | Read: All, Write: Admin |
| `PUT` | `/academics/terms/{id}/activate` | Set active academic term | Admin |
| `GET`/`POST` | `/academics/departments` | List / Create academic departments | Read: All, Write: Admin |
| `GET`/`POST` | `/academics/programs` | List / Create degree programs | Read: All, Write: Admin |
| `GET`/`POST` | `/academics/subjects` | List / Create catalog subjects | Read: All, Write: Admin |
| `GET`/`POST` | `/academics/sections` | List / Create curriculum sections | Read: All, Write: Admin, Registrar |

### 2.4 Class Offerings, Timetable & Enrollments (`/api/v1/classes`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET`/`POST` | `/classes/offerings` | List / Create class offerings | Read: All, Write: Admin |
| `GET` | `/classes/my-offerings` | Offerings assigned to current instructor | Instructor |
| `GET` | `/classes/offerings/{id}` | Offering details with schedules & roster | Instructor (assigned), Admin, Dept Head |
| `POST` | `/classes/offerings/{id}/schedules` | Add schedule day/time with conflict check | Admin |
| `GET` | `/classes/offerings/{id}/roster` | List enrolled students for an offering | Instructor (assigned), Admin, Dept Head |
| `POST` | `/classes/offerings/{id}/enroll` | Enroll student into class offering | Admin, Registrar |
| `DELETE`| `/classes/offerings/{id}/enroll/{student_id}` | Drop/withdraw student enrollment | Admin, Registrar |

### 2.5 Class Meetings & Attendance (`/api/v1/attendance`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET` | `/attendance/meetings` | Query meetings by offering and date range | Instructor, Admin, Dept Head |
| `POST` | `/attendance/meetings/open` | Open or retrieve class meeting for taking attendance | Instructor (assigned), Admin |
| `GET` | `/attendance/meetings/{id}/sheet` | Fetch attendance sheet with enrolled students | Instructor (assigned), Admin |
| `POST` | `/attendance/meetings/{id}/submit` | Batch save and submit final attendance roster | Instructor (assigned), Admin |
| `POST` | `/attendance/corrections/request` | Submit correction request for submitted meeting | Instructor (assigned) |
| `GET` | `/attendance/corrections` | List pending correction requests | Admin, Dept Head |
| `PUT` | `/attendance/corrections/{id}` | Approve or reject correction request | Admin, Dept Head |

### 2.6 Attendance Reports (`/api/v1/reports`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET` | `/reports/daily` | Daily institutional/departmental class summary | Admin, Dept Head, Registrar |
| `GET` | `/reports/student/{id}` | Comprehensive attendance transcript for student | Admin, Dept Head, Registrar |
| `GET` | `/reports/subject/{offering_id}` | Subject offering attendance breakdown | Instructor (assigned), Admin, Dept Head |
| `GET` | `/reports/semester` | Semester cumulative attendance matrix | Admin, Dept Head, Registrar |
| `GET` | `/reports/incomplete` | Missing/unrecorded attendance sessions | Admin, Dept Head |
| `GET` | `/reports/export/{type}` | Download report as CSV or printable PDF | Role authorized for report type |

### 2.7 Audit Logs & System Health (`/api/v1/system`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET` | `/system/users` | List system users | Admin |
| `POST` | `/system/users` | Create user account | Admin |
| `PUT` | `/system/users/{id}` | Update user details or active status | Admin |
| `GET` | `/system/audit-logs` | Filter and paginate security & data audit logs | Admin |
| `GET` | `/system/health` | System health check (DB connection, disk space) | Admin |
| `POST` | `/system/backups/trigger` | Trigger manual database snapshot | Admin |
