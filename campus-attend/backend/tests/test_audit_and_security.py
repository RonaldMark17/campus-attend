import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from scripts.backup_db import perform_backup, sha256_checksum
from scripts.restore_db import verify_backup_integrity

@pytest.fixture
def client():
    return TestClient(app)

def login_as(client, username, password):
    res = client.post("/api/v1/auth/login", json={"username_or_email": username, "password": password})
    assert res.status_code == 200

def test_security_headers_middleware(client):
    """Verify production security headers are attached to API responses."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers["permissions-policy"]

def test_audit_logs_role_protection(client):
    """Verify audit logs are accessible only by System Administrators."""
    # 1. Instructor attempts access -> 403 Forbidden
    login_as(client, "instructor1", "password123")
    res = client.get("/api/v1/audit-logs")
    assert res.status_code == 403

    # 2. Admin logs in -> 200 OK
    login_as(client, "admin", "admin123")
    res = client.get("/api/v1/audit-logs")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data

    # 3. Admin exports CSV
    csv_res = client.get("/api/v1/audit-logs/export-csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Timestamp (UTC)" in csv_res.text

def test_backup_and_checksum_integrity():
    """Verify programmatic backup execution and SHA-256 tamper-evident checksums."""
    backup_path = perform_backup()
    assert backup_path.exists()
    assert backup_path.stat().st_size > 0

    checksum_file = backup_path.with_suffix(backup_path.suffix + ".sha256")
    assert checksum_file.exists()

    expected_sha = sha256_checksum(backup_path)
    stored_sha = checksum_file.read_text().split()[0]
    assert expected_sha == stored_sha

    # Test integrity verification
    assert verify_backup_integrity(backup_path) is True
