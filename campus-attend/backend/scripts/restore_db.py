"""
CampusAttend Database Restoration Verification & Recovery Script
- Validates SHA-256 checksum
- Performs SQLite integrity check before replacing active database
- Takes a safety snapshot of the existing database before performing restoration
"""

import os
import sys
import shutil
import hashlib
import sqlite3
from pathlib import Path
from typing import Optional

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

def verify_backup_integrity(backup_path: Path) -> bool:
    """Verifies checksum and runs PRAGMA integrity_check."""
    checksum_file = backup_path.with_suffix(backup_path.suffix + ".sha256")
    if checksum_file.exists():
        stored_checksum = checksum_file.read_text(encoding="utf-8").split()[0].strip()
        computed_checksum = sha256_checksum(backup_path)
        if stored_checksum != computed_checksum:
            print(f"[!] Checksum mismatch! Stored: {stored_checksum}, Computed: {computed_checksum}")
            return False
        print(f"[+] SHA-256 Checksum verified: {computed_checksum[:16]}...")

    conn = sqlite3.connect(backup_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA integrity_check;")
    result = cursor.fetchone()[0]
    conn.close()

    if result.lower() == "ok":
        print(f"[+] SQLite database integrity check PASSED.")
        return True
    else:
        print(f"[!] Integrity check FAILED: {result}")
        return False

def restore_database(backup_filename: Optional[str] = None):
    if backup_filename:
        backup_path = BACKUP_DIR / backup_filename
    else:
        backups = sorted(BACKUP_DIR.glob("campusattend_backup_*.db"), key=os.path.getmtime, reverse=True)
        if not backups:
            raise FileNotFoundError("No backups found in backups directory.")
        backup_path = backups[0]

    print(f"[*] Selected backup file for restoration: {backup_path.name}")
    if not verify_backup_integrity(backup_path):
        raise ValueError("Backup integrity validation failed. Aborting restoration.")

    # Create safety snapshot of current active DB
    if DB_FILE.exists():
        safety_path = BACKEND_DIR / f"campusattend.db.pre_restore_safety"
        shutil.copy2(DB_FILE, safety_path)
        print(f"[*] Created safety snapshot: {safety_path.name}")

    # Copy backup over active database
    shutil.copy2(backup_path, DB_FILE)
    print(f"[+] RESTORATION SUCCESSFUL! Active database restored from {backup_path.name}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    try:
        restore_database(target)
    except Exception as e:
        print(f"[!] Restoration failed: {e}", file=sys.stderr)
        sys.exit(1)
