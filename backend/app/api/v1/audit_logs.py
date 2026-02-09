from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.audit_log import AuditLogRead
from app.services.audit import list_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=dict)
async def list_audit_logs_endpoint(
    user_id: int | None = Query(None),
    action: str | None = Query(None),
    module: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.view")),
):
    result = await list_audit_logs(
        db,
        user_id=user_id,
        action=action,
        module=module,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    result["items"] = [AuditLogRead.model_validate(log) for log in result["items"]]
    return result
