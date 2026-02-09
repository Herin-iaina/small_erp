from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.role import RoleRead


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None


class UserCreate(UserBase):
    password: str
    pin: str | None = None  # 4-6 digit PIN
    company_id: int | None = None
    role_id: int | None = None

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: str | None) -> str | None:
        if v is not None:
            if not v.isdigit() or not (4 <= len(v) <= 6):
                raise ValueError("PIN must be 4-6 digits")
        return v


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    is_active: bool | None = None
    company_id: int | None = None
    role_id: int | None = None


class UserSetPin(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not v.isdigit() or not (4 <= len(v) <= 6):
            raise ValueError("PIN must be 4-6 digits")
        return v


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str


class UserRead(UserBase):
    id: int
    is_active: bool
    has_pin: bool
    company_id: int | None
    role_id: int | None
    role: RoleRead | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserMe(UserRead):
    """Extended response for the /me endpoint with permissions."""

    permissions: list[str] = []
