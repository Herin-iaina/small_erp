from datetime import datetime

from pydantic import BaseModel


class RoleBase(BaseModel):
    name: str
    label: str
    permissions: list[str] = []
    is_superadmin: bool = False
    multi_company: bool = False


class RoleCreate(RoleBase):
    company_id: int | None = None


class RoleUpdate(BaseModel):
    name: str | None = None
    label: str | None = None
    permissions: list[str] | None = None
    multi_company: bool | None = None


class RoleRead(RoleBase):
    id: int
    company_id: int | None
    is_system: bool
    user_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
