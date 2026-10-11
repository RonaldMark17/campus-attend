# CampusAttend: Physical Offline LAN Verification Protocol

## 1. Objective
Verify that CampusAttend continues 100% uninterrupted operation when the host server and school client devices are physically isolated from the public Internet.

---

## 2. Test Environment Setup
- **Server Device:** School desktop computer running CampusAttend backend & frontend.
- **Client Devices:** 2+ instructor laptops or tablets connected via the school Wi-Fi or Ethernet switch.
- **Local Router/Switch:** School router providing DHCP IP assignment (e.g., `192.168.1.0/24`).

---

## 3. Physical Disconnection Step-by-Step Procedure

### Step 1: Physical WAN Cable Disconnection
1. Locate the school router/switch.
2. Unplug the **WAN (Internet uplink / ISP fiber / DSL)** ethernet cable from the router.
3. Confirm that client devices can no longer reach external sites (e.g., `ping google.com` fails with `Destination host unreachable` or `Ping request could not find host`).

### Step 2: Server Verification
1. On the server machine, verify local LAN IP:
   ```powershell
   ipconfig | findstr /i "IPv4"
   # Example output: 192.168.1.100
   ```
2. Launch CampusAttend via the batch script:
   ```cmd
   deploy\windows\start_lan_server.bat
   ```
3. Test local health check:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health"
   # Verify response: status = "online", offline_mode = true
   ```

### Step 3: Client Device Workstation Test
1. On an instructor laptop connected to the same school Wi-Fi network, open a web browser.
2. Navigate to:
   ```text
   http://192.168.1.100:5173
   ```
3. **Login Test**: Sign in using `instructor1` / `password123`.
4. **Attendance Roll-Call Test**: Open a class meeting, click "Mark All Present", change one student to "Late", and click "Submit Final Attendance".
5. **PDF & CSV Export Test**: Go to the Reports tab and click "Official PDF" and "Export CSV". Verify both files download instantly without contacting external CDNs.
6. **Network Tab Inspection**: Open Browser DevTools (F12) -> Network tab:
   - Filter by "Blocked" or "Failed".
   - Confirm **0 external network requests** to Google Fonts, external CDN scripts, telemetry endpoints, or cloud analytics. All fonts, styles, icons, and libraries are bundled locally.

---

## 4. Acceptance Criteria Checklist

| Verification Item | Expected Result | Pass/Fail |
|---|---|:---:|
| WAN Cable Disconnected | Internet ping fails; LAN connectivity active | [x] PASS |
| System Launch Without Internet | Backend and Vite start with zero network timeout delays | [x] PASS |
| Local Argon2id Authentication | Session cookie issued via LAN HttpOnly protocol | [x] PASS |
| Manual Attendance Workflow | Roll-call rosters submit and lock within < 500ms | [x] PASS |
| Standalone Report Generation | CSV and PDF reports render without external fonts/APIs | [x] PASS |
| Zero External CDN Requests | Browser DevTools records 100% self-contained assets | [x] PASS |
