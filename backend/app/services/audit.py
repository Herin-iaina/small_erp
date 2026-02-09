from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


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
