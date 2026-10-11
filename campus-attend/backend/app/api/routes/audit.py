import io
import csv
from math import ceil
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.permissions.guards import require_role
from app.schemas.audit import AuditLogListResponse, AuditLogItem

router = APIRouter(prefix="/audit-logs", tags=["Audit & Security"])

@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action code, e.g. LOGIN, SUBMIT_ATTENDANCE"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Retrieve security and mutation audit trail (Admin only)."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    total = query.count()
    logs = (
        query.order_by(desc(AuditLog.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for log in logs:
        items.append(
            AuditLogItem(
                id=log.id,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                user_id=log.user_id,
                user_name=log.user.full_name if log.user else "System",
                user_role=log.user.role if log.user else "system",
                ip_address=log.ip_address,
                old_values=log.old_values,
                new_values=log.new_values,
                timestamp=log.timestamp,
            )
        )

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 1,
    )

@router.get("/export-csv")
def export_audit_logs_csv(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Export complete audit trail to CSV for RA 10173 compliance reporting."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(desc(AuditLog.timestamp)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp (UTC)", "Action", "Entity Type", "Entity ID", "User Name", "User Role", "IP Address", "Old Values", "New Values"])

    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat(),
            log.action,
            log.entity_type,
            log.entity_id or "",
            log.user.full_name if log.user else "System",
            log.user.role if log.user else "system",
            log.ip_address or "",
            str(log.old_values) if log.old_values else "",
            str(log.new_values) if log.new_values else "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="campusattend_audit_logs.csv"'},
    )
