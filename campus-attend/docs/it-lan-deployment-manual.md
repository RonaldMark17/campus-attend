# CampusAttend: IT Infrastructure & LAN Deployment Manual

## 1. System Requirements & Hardware Sizing

CampusAttend is engineered to run on standard, existing school desktop computers without requiring enterprise server hardware or cloud infrastructure.

### Recommended Server Specifications (Up to 2,500 active students)
- **Processor:** Intel Core i3 / AMD Ryzen 3 or higher (4+ cores recommended)
- **Memory (RAM):** 8 GB DDR4
- **Storage:** 256 GB SSD (SATA or NVMe) with NTFS or ext4 filesystem
- **Operating System:** Windows 10/11 Pro, Windows Server 2019/2022, or Ubuntu 22.04/24.04 LTS
- **Network Interface:** 1 Gbps Gigabit Ethernet NIC connected via Cat5e/Cat6 cable directly to the core campus switch.

---

## 2. Network & Router Configuration

### 2.1 Static IP Reservation
1. Access the school router's admin interface (e.g., `192.168.1.1`).
2. Navigate to **DHCP Settings** -> **Static Lease / Address Reservation**.
3. Bind the MAC address of the CampusAttend host machine to a dedicated IP address (e.g., `192.168.1.100`).

### 2.2 Local DNS Host Mapping (Optional but Recommended)
To allow faculty members to browse to `http://attendance.school.lan` instead of raw numbers:
- If using a router with DNSmasq (or Windows Server DNS / Pi-hole): Add an `A` record pointing `attendance.school.lan` to `192.168.1.100`.
- On client computers, the local `hosts` file (`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`) can also map:
  ```text
  192.168.1.100    attendance.school.lan
  ```

### 2.3 Firewall Inbound Rules
Ensure inbound traffic on ports **80** (HTTP), **443** (HTTPS), **5173** (Vite Dev / Preview), and **8000** (FastAPI) is allowed on the host machine:

**Windows Firewall (PowerShell):**
```powershell
New-NetFirewallRule -DisplayName "CampusAttend HTTP/HTTPS" -Direction Inbound -LocalPort 80,443,5173,8000 -Protocol TCP -Action Allow
```

**Linux UFW:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5173/tcp
sudo ufw allow 8000/tcp
```

---

## 3. Automated Nightly Backups

Backups should execute automatically every night at 11:00 PM.

### On Windows Server (Windows Task Scheduler):
Run the following PowerShell command as Administrator to register the nightly task:
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -Command `"Set-Location 'C:\campus-attend\backend'; .\venv\Scripts\python.exe scripts\backup_db.py`""
$trigger = New-ScheduledTaskTrigger -Daily -At 11:00PM
Register-ScheduledTask -TaskName "CampusAttend_Nightly_Backup" -Action $action -Trigger $trigger -Description "Nightly database snapshot with 7-day retention and SHA256 checksums"
```

### On Linux Server (Cron):
Add to `/etc/cron.d/campusattend-backup`:
```text
0 23 * * * campusattend cd /opt/campusattend/backend && ./venv/bin/python scripts/backup_db.py >> /var/log/campusattend/backup.log 2>&1
```

---

## 4. Disaster Recovery Procedure
If the host computer suffers disk failure or corruption:
1. Reinstall Python 3.11+ and Node.js on replacement computer.
2. Clone or copy the `campus-attend` application directory.
3. Locate the latest backup file from USB storage / external hard drive:
   `campusattend_backup_YYYYMMDD_HHMMSS.db`.
4. Run the restore verification tool:
   ```powershell
   python scripts\restore_db.py campusattend_backup_YYYYMMDD_HHMMSS.db
   ```
5. The restore script verifies the SHA-256 checksum, passes SQLite integrity checks, and mounts the clean database.
