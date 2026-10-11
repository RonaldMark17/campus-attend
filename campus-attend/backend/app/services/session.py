import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User, UserSession
from app.core.config import settings

def create_user_session(
    db: Session,
    user: User,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> UserSession:
    """Create a new database-backed session for an authenticated user."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

    session = UserSession(
        user_id=user.id,
        session_token=token,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def get_valid_user_session(db: Session, session_token: str) -> Optional[UserSession]:
    """Retrieve and validate an active session token."""
    if not session_token:
        return None

    now = datetime.now(timezone.utc)
    session = (
        db.query(UserSession)
        .filter(UserSession.session_token == session_token)
        .first()
    )

    if not session:
        return None

    # Check expiration
    # Normalize session.expires_at to timezone.utc if naive
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if expires < now:
        # Session expired: clean it up
        db.delete(session)
        db.commit()
        return None

    # Verify user account is still active
    if not session.user or not session.user.is_active:
        return None

    return session

def invalidate_user_session(db: Session, session_token: str) -> bool:
    """Invalidate and remove a specific session on logout."""
    session = (
        db.query(UserSession)
        .filter(UserSession.session_token == session_token)
        .first()
    )
    if session:
        db.delete(session)
        db.commit()
        return True
    return False

def invalidate_all_user_sessions(db: Session, user_id: str) -> int:
    """Invalidate all sessions for a user (e.g. on password change or deactivation)."""
    deleted_count = (
        db.query(UserSession)
        .filter(UserSession.user_id == user_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted_count
