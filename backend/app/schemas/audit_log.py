from datetime import datetime

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: int
    user_id: int | None
    user_email: str
    action: str
    module: str
    entity_type: str | None
    entity_id: int | None
    description: str | None
    company_id: int | None
    ip_address: str | None
    authorized_by_user_id: int | None
    authorized_by_email: str | None
    pin_verified: bool | None
    old_values: dict | None
    new_values: dict | None
    timestamp: datetime

    model_config = {"from_attributes": True}
