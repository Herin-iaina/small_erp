from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.pagination import paginate


async def log_action(
    db: AsyncSession,
    *,
    user: User,
    action: str,
    module: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    description: str | None = None,
    ip_address: str | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    authorized_by: User | None = None,
    pin_verified: bool | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action=action,
        module=module,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        company_id=user.company_id,
        ip_address=ip_address,
        old_values=old_values,
        new_values=new_values,
        authorized_by_user_id=authorized_by.id if authorized_by else None,
        authorized_by_email=authorized_by.email if authorized_by else None,
        pin_verified=pin_verified,
    )
    db.add(log)
    return log


async def list_audit_logs(
    db: AsyncSession,
    *,
    user_id: int | None = None,
    action: str | None = None,
    module: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)
    if action is not None:
        query = query.where(AuditLog.action == action)
    if module is not None:
        query = query.where(AuditLog.module == module)
    if date_from is not None:
        query = query.where(AuditLog.timestamp >= date_from)
    if date_to is not None:
        query = query.where(AuditLog.timestamp <= date_to)
    return await paginate(db, query, page, page_size)
