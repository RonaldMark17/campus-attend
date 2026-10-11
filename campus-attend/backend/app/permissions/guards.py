from typing import Callable, Sequence
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.course import ClassOffering
from app.services.session import get_valid_user_session

def get_current_user(
    campusattend_session: str = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve and authenticate the current user from the session cookie."""
    if not campusattend_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Cookie"},
        )

    session = get_valid_user_session(db, campusattend_session)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
            headers={"WWW-Authenticate": "Cookie"},
        )

    if not session.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an administrator.",
        )

    return session.user

def require_role(*allowed_roles: str) -> Callable[[User], User]:
    """Factory creating dependency to enforce server-side role-based access control."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Access restricted to roles: {', '.join(allowed_roles)}.",
            )
        return current_user
    return role_checker

def verify_class_instructor(
    offering_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ClassOffering:
    """
    Ensure instructors can only access class offerings assigned to them.
    Admins have universal access.
    """
    offering = db.query(ClassOffering).filter(ClassOffering.id == offering_id).first()
    if not offering:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class offering not found.",
        )

    if current_user.role == "admin":
        return offering

    if current_user.role == "instructor" and offering.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not assigned to instruct this class offering.",
        )

    return offering
