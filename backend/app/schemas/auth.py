from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str  # No strict validation here – the DB lookup handles it
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PinVerifyRequest(BaseModel):
    pin: str  # 4-6 digits
    action: str  # The permission being authorized (e.g. "pos.refund")
    entity_type: str | None = None
    entity_id: int | None = None


class PinVerifyResponse(BaseModel):
    verified: bool
    message: str
