"""
CampusAttend Database Backup Automation Script
- Performs atomic backup of the database
- Calculates SHA-256 checksum for tamper-evidence
- Automatically enforces 7-day retention policy
"""

import os
import sys
import shutil
import hashlib
import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Setup paths
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
DB_FILE = BACKEND_DIR / "campusattend.db"
BACKUP_DIR = BACKEND_DIR / "backups"

def sha256_checksum(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def perform_backup(retention_days: int = 7) -> Path:
    if not DB_FILE.exists():
        raise FileNotFoundError(f"Source database file not found at {DB_FILE}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"campusattend_backup_{timestamp_str}.db"
    backup_path = BACKUP_DIR / backup_filename
    checksum_path = BACKUP_DIR / f"{backup_filename}.sha256"

    print(f"[*] Initiating SQLite online backup API to: {backup_path.name}")
    # Use SQLite online backup API to ensure a 100% consistent read without locking out workers
    src_conn = sqlite3.connect(DB_FILE)
    dst_conn = sqlite3.connect(backup_path)
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    # Calculate and store checksum
    checksum = sha256_checksum(backup_path)
    checksum_path.write_text(f"{checksum}  {backup_filename}\n", encoding="utf-8")
    print(f"[+] Backup successfully completed!")
    print(f"    File: {backup_path}")
    print(f"    Size: {backup_path.stat().st_size:,} bytes")
    print(f"    SHA256: {checksum}")

    # Enforce retention policy
    cutoff_time = datetime.now().timestamp() - (retention_days * 86400)
    pruned_count = 0
    for item in BACKUP_DIR.glob("campusattend_backup_*.db*"):
        if item.stat().st_mtime < cutoff_time:
            item.unlink()
            pruned_count += 1

    if pruned_count > 0:
        print(f"[*] Pruned {pruned_count} backup files older than {retention_days} days.")

    return backup_path

if __name__ == "__main__":
    try:
        perform_backup()
    except Exception as e:
        print(f"[!] Backup failed: {e}", file=sys.stderr)
        sys.exit(1)
