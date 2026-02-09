from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    PinVerifyRequest,
    PinVerifyResponse,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.user import UserMe
from app.services.auth import (
    authenticate_user,
    create_tokens,
    refresh_access_token,
    verify_user_pin,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    return create_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await refresh_access_token(db, body.refresh_token)


@router.get("/me", response_model=UserMe)
async def me(current_user: User = Depends(get_current_user)):
    permissions: list[str] = []
    if current_user.role:
        if current_user.role.is_superadmin:
            permissions = ["*.*"]
        else:
            permissions = current_user.role.permissions or []

    return UserMe(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        is_active=current_user.is_active,
        has_pin=current_user.has_pin,
        company_id=current_user.company_id,
        role_id=current_user.role_id,
        role=current_user.role,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        permissions=permissions,
    )


@router.post("/verify-pin", response_model=PinVerifyResponse)
async def verify_pin(
    body: PinVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_user_pin(
        db, current_user, body.pin, body.action, body.entity_type, body.entity_id
    )
    return PinVerifyResponse(verified=True, message="PIN verified successfully")
