from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password, hash_pin, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.utils.pagination import paginate


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        company_id=data.company_id,
        role_id=data.role_id,
    )
    if data.pin:
        user.hashed_pin = hash_pin(data.pin)
    db.add(user)
    await db.flush()
    return user


async def get_user(db: AsyncSession, user_id: int) -> User:
    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def list_users(
    db: AsyncSession,
    company_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = select(User).options(selectinload(User.role)).order_by(User.last_name)
    if company_id is not None:
        query = query.where(User.company_id == company_id)
    return await paginate(db, query, page, page_size)


async def update_user(db: AsyncSession, user_id: int, data: UserUpdate) -> User:
    user = await get_user(db, user_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()
    return user


async def set_user_pin(db: AsyncSession, user_id: int, pin: str) -> User:
    user = await get_user(db, user_id)
    user.hashed_pin = hash_pin(pin)
    await db.flush()
    return user


async def change_password(
    db: AsyncSession, user: User, current_password: str, new_password: str
) -> User:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    user.hashed_password = hash_password(new_password)
    await db.flush()
    return user
