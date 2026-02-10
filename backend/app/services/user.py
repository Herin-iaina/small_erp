from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password, hash_pin, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def create_user(
    db: AsyncSession, data: UserCreate, current_user: User | None = None
) -> User:
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
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="create",
            module="admin",
            entity_type="user",
            entity_id=user.id,
            description=f"Created user '{user.email}'",
            new_values={"email": user.email, "first_name": user.first_name, "last_name": user.last_name},
        )
    return await get_user(db, user.id)


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
    role_id: int | None = None,
    is_active: bool | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = select(User).options(selectinload(User.role)).order_by(User.last_name)
    if company_id is not None:
        query = query.where(User.company_id == company_id)
    if role_id is not None:
        query = query.where(User.role_id == role_id)
    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                User.first_name.ilike(term),
                User.last_name.ilike(term),
                User.email.ilike(term),
            )
        )
    return await paginate(db, query, page, page_size)


async def update_user(
    db: AsyncSession,
    user_id: int,
    data: UserUpdate,
    current_user: User | None = None,
) -> User:
    user = await get_user(db, user_id)
    update_data = data.model_dump(exclude_unset=True)
    old_values = {k: getattr(user, k) for k in update_data}
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="update",
            module="admin",
            entity_type="user",
            entity_id=user.id,
            description=f"Updated user '{user.email}'",
            old_values=old_values,
            new_values=update_data,
        )
    return await get_user(db, user_id)


async def set_user_pin(
    db: AsyncSession, user_id: int, pin: str, current_user: User | None = None
) -> User:
    user = await get_user(db, user_id)
    user.hashed_pin = hash_pin(pin)
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="set_pin",
            module="admin",
            entity_type="user",
            entity_id=user.id,
            description=f"Set PIN for user '{user.email}'",
        )
    return await get_user(db, user_id)


async def toggle_user_status(
    db: AsyncSession, user_id: int, current_user: User | None = None
) -> User:
    user = await get_user(db, user_id)
    old_status = user.is_active
    user.is_active = not user.is_active
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="toggle_status",
            module="admin",
            entity_type="user",
            entity_id=user.id,
            description=f"{'Activated' if user.is_active else 'Deactivated'} user '{user.email}'",
            old_values={"is_active": old_status},
            new_values={"is_active": user.is_active},
        )
    return await get_user(db, user_id)


async def admin_reset_password(
    db: AsyncSession, user_id: int, new_password: str, current_user: User | None = None
) -> User:
    user = await get_user(db, user_id)
    user.hashed_password = hash_password(new_password)
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="reset_password",
            module="admin",
            entity_type="user",
            entity_id=user.id,
            description=f"Reset password for user '{user.email}'",
        )
    return await get_user(db, user_id)


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
    return await get_user(db, user.id)
