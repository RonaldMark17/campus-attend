from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.database import get_db
from app.api.routes.auth import router as auth_router
from app.api.routes.students import router as students_router
from app.api.routes.academics import router as academics_router
from app.api.routes.attendance import router as attendance_router
from app.api.routes.reports import router as reports_router
from app.api.routes.audit import router as audit_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CampusAttend: School-Network-Only College Attendance Management System",
    version="1.0.0",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Custom Security Headers Middleware (Phase 7 Hardening)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration for school LAN clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://attendance.school.lan",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register versioned API routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(students_router, prefix=settings.API_V1_STR)
app.include_router(academics_router, prefix=settings.API_V1_STR)
app.include_router(attendance_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)

@app.get(f"{settings.API_V1_STR}/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint verifying database connectivity and server status."""
    try:
        # Verify database connection
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "offline_mode": True,
    }

@app.get("/", include_in_schema=False)
def root():
    return {
        "message": "Welcome to CampusAttend API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
