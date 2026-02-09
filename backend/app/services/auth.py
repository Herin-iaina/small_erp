from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
    verify_pin,
)
from app.models.user import User
from app.services.audit import log_action


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User:
    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(User.email == email)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    return user


def create_tokens(user: User) -> dict:
    data = {"sub": str(user.id), "email": user.email}
    if user.company_id:
        data["company_id"] = str(user.company_id)
    return {
        "access_token": create_access_token(data),
        "refresh_token": create_refresh_token(data),
        "token_type": "bearer",
    }


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict:
    try:
        payload = decode_token(refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(User.id == int(user_id))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return create_tokens(user)


async def verify_user_pin(
    db: AsyncSession,
    user: User,
    pin: str,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> bool:
    if not user.hashed_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no PIN configured",
        )

    verified = verify_pin(pin, user.hashed_pin)

    await log_action(
        db,
        user=user,
        action=action,
        module=action.split(".")[0] if "." in action else "system",
        entity_type=entity_type,
        entity_id=entity_id,
        description=f"PIN verification for {action}: {'success' if verified else 'failed'}",
        authorized_by=user if verified else None,
        pin_verified=verified,
    )

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid PIN",
        )
    return True
