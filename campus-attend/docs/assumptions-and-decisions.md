# CampusAttend: Assumptions & Decisions Requiring School Approval

The following key technical and policy decisions have been established as solid defaults for CampusAttend, but require formal verification and sign-off by the college administration and IT department before production rollout.

---

## 1. Academic & Attendance Policies

| Policy Decision | Default System Proposal | School Verification / Approval Needed |
|---|---|---|
| **Late vs Absent Calculation** | "Late" is recorded as a distinct metric; it is NOT automatically converted into an absence in standard attendance percentages unless specifically mandated. | Confirm whether institutional policy dictates that a specific number of tardy marks (e.g., 3 lates = 1 unexcused absence) converts to an absence for final grade compliance. |
| **Attendance Submission Window** | Instructors are expected to submit attendance within **24 hours** of the scheduled class meeting start time. After 24 hours, the meeting flags as "Incomplete / Overdue" on department dashboards. | Confirm the institution's official grace period for attendance logging. |
| **Correction Approval Authority** | Instructors cannot modify attendance once submitted. They may file a correction request with an explanation; this request must be approved by the **Department Head** (or Admin). | Confirm whether Department Heads have sole approval authority, or if the Registrar must also sign off. |
| **Attendance Percentage Formula** | `Attendance Rate = (Present + Late + Excused) / Total Meetings Held * 100%`. Unsubmitted meetings are excluded from the denominator. | Confirm the college's standard formula for academic clearance and honors qualification. |

---

## 2. IT Infrastructure & Network Allocation

| Technical Parameter | Default Proposal | School IT Action Required |
|---|---|---|
| **Server Static IP Address** | `192.168.10.10/24` | Assign a reserved static IP address on the school's faculty/server VLAN. |
| **Internal DNS Hostname** | `attendance.school.lan` | Configure the institutional router or local DNS server (e.g., Pi-hole, Windows Server DNS) to map this domain to the server's static IP. |
| **Internal TLS / HTTPS Trust** | Self-hosted Internal Certificate Authority (CA) created via OpenSSL; Root CA certificate installed onto school devices. | Decide whether IT will push the Root CA certificate via Group Policy / MDM, or if instructors will follow a one-time certificate trust guide for personal devices. |
| **Device Access Boundary** | Access permitted across school Wi-Fi and wired faculty lab PCs; blocked on open student/guest Wi-Fi networks. | Configure school Wi-Fi access points to restrict the attendance subnet to authorized faculty and staff SSIDs. |

---

## 3. Data Privacy & Compliance (RA 10173)

| Governance Item | Default Proposal | Institutional Sign-Off Required |
|---|---|---|
| **Student Data Processing Authorization** | System uses synthetic/mock student data for all development and testing phases. Real student names, numbers, and emails loaded only upon formal written authorization. | Data Protection Officer (DPO) and Registrar formal approval of student roster ingestion. |
| **Student Number Format** | Standardized alphanumeric format: `YYYY-NNNNN` (e.g., `2024-01234`). | Confirm existing Registrar student numbering conventions to adjust CSV regex validators. |
| **Record Retention Policy** | Active attendance records kept online for 5 academic years in compliance with CHED/depEd guidelines, after which older terms can be archived. | Confirm the college's data retention and disposal schedule. |
