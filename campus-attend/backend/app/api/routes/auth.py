from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.auth import LoginRequest, UserResponse, ChangePasswordRequest, AdminResetPasswordRequest
from app.services.session import create_user_session, invalidate_user_session, invalidate_all_user_sessions
from app.services.rate_limiter import login_rate_limiter
from app.permissions.guards import get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user credentials, enforce LAN rate limiting, and issue an HttpOnly session cookie.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{payload.username_or_email.lower().strip()}"

    # 1. Enforce rate limiting
    is_limited, remaining_seconds = login_rate_limiter.is_rate_limited(rate_limit_key)
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {remaining_seconds} seconds.",
        )

    # 2. Query user by username or email
    user = (
        db.query(User)
        .filter(
            (User.username == payload.username_or_email) |
            (User.email == payload.username_or_email)
        )
        .first()
    )

    # 3. Verify credentials (constant-time evaluation to prevent timing attacks)
    if not user or not verify_password(payload.password, user.hashed_password):
        login_rate_limiter.record_failure(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )

    # 4. Check active account status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator.",
        )

    # 5. Success: reset rate limit attempts
    login_rate_limiter.reset_failures(rate_limit_key)

    # 6. Create session in database
    user_agent = request.headers.get("user-agent", "")
    session = create_user_session(
        db=db,
        user=user,
        ip_address=client_ip,
        user_agent=user_agent[:255] if user_agent else None
    )

    # 7. Deliver HttpOnly, SameSite, Secure cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session.session_token,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/",
    )

    # 8. Log audit trail
    audit = AuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        entity_type="user",
        entity_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
        old_values=None,
        new_values={"role": user.role, "timestamp": datetime.now(timezone.utc).isoformat()},
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()

    return user

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Invalidate active session in the database and clear the session cookie.
    """
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if token:
        invalidate_user_session(db, token)

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
    )
    return {"message": "Successfully logged out."}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve current authenticated user profile, server-enforced role, and status.
    """
    return current_user

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allow users to update their own password after verifying their old password.
    """
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    # Invalidate other active sessions for security
    invalidate_all_user_sessions(db, current_user.id)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_CHANGED",
        entity_type="user",
        entity_id=current_user.id,
        ip_address=None,
        user_agent=None,
        old_values=None,
        new_values={"action": "self_password_change"},
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()

    return {"message": "Password changed successfully. Please log in again."}

@router.post("/reset-password/{user_id}")
def admin_reset_password(
    user_id: str,
    payload: AdminResetPasswordRequest,
    current_admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """
    Administrator-assisted password reset for any user.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found.",
        )

    target_user.hashed_password = hash_password(payload.new_password)
    # Invalidate target user's active sessions
    invalidate_all_user_sessions(db, target_user.id)

    # Audit log
    audit = AuditLog(
        user_id=current_admin.id,
        action="ADMIN_RESET_PASSWORD",
        entity_type="user",
        entity_id=target_user.id,
        ip_address=None,
        user_agent=None,
        old_values=None,
        new_values={"target_username": target_user.username},
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()

    return {"message": f"Password for user '{target_user.username}' successfully reset."}
