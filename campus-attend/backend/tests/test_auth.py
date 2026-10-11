import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.services.rate_limiter import login_rate_limiter

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_login_success(client):
    """Verify that logging in with valid credentials issues an HttpOnly cookie and user profile."""
    # Reset any test rate limits
    login_rate_limiter.reset_failures("testclient:admin")
    
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["role"] == "admin"
    assert settings.SESSION_COOKIE_NAME in response.cookies

def test_login_invalid_password(client):
    """Verify that wrong password returns 401 Unauthorized."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "WrongPassword999!"},
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]

def test_login_deactivated_account(client, db):
    """Verify that inactive accounts cannot authenticate."""
    user = db.query(User).filter_by(username="instructor2").first()
    assert user is not None
    user.is_active = False
    db.commit()

    try:
        response = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "instructor2", "password": "password123"},
        )
        assert response.status_code == 403
        assert "deactivated" in response.json()["detail"]
    finally:
        user.is_active = True
        db.commit()

def test_login_rate_limiting(client):
    """Verify that consecutive failed attempts trigger 429 Too Many Requests."""
    key = "testclient:ratelimit_user"
    login_rate_limiter.reset_failures(key)

    # 5 failed attempts
    for _ in range(5):
        client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "ratelimit_user", "password": "bad_password"},
        )

    # 6th attempt must be blocked with 429
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "ratelimit_user", "password": "bad_password"},
    )
    assert res.status_code == 429
    assert "Too many failed login attempts" in res.json()["detail"]

    # Cleanup
    login_rate_limiter.reset_failures(key)

def test_current_user_me_endpoint(client):
    """Verify /auth/me returns current user profile when session cookie is provided."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "instructor1", "password": "password123"},
    )
    assert login_res.status_code == 200

    # Request /me with the session cookie automatically included in TestClient
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "instructor1"
    assert me_res.json()["role"] == "instructor"

def test_unauthenticated_request_rejected(client):
    """Verify protected endpoints reject requests without a session cookie."""
    client.cookies.clear()
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

def test_logout_invalidates_session(client):
    """Verify logging out deletes the cookie and invalidates the session."""
    client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "admin123"},
    )
    
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # /auth/me must now return 401
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 401
