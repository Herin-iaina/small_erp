from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def create_role(
    db: AsyncSession, data: RoleCreate, current_user: User | None = None
) -> Role:
    role = Role(**data.model_dump())
    db.add(role)
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="create",
            module="admin",
            entity_type="role",
            entity_id=role.id,
            description=f"Created role '{role.label}'",
            new_values=data.model_dump(),
        )
    return await get_role(db, role.id)


async def get_role(db: AsyncSession, role_id: int) -> Role:
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role


async def list_roles(
    db: AsyncSession,
    company_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    # Subquery to count users per role
    user_count_sq = (
        select(User.role_id, func.count(User.id).label("user_count"))
        .group_by(User.role_id)
        .subquery()
    )
    query = (
        select(Role, func.coalesce(user_count_sq.c.user_count, 0).label("user_count"))
        .outerjoin(user_count_sq, Role.id == user_count_sq.c.role_id)
        .order_by(Role.name)
    )
    if company_id is not None:
        query = query.where(
            (Role.company_id == company_id) | (Role.company_id.is_(None))
        )

    # Manual pagination since we have a tuple result
    count_query = select(func.count()).select_from(
        select(Role.id).where(
            (Role.company_id == company_id) | (Role.company_id.is_(None))
        ).subquery()
        if company_id is not None
        else select(Role.id).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    rows = result.all()

    items = []
    for row in rows:
        role = row[0]
        role._user_count = row[1]
        items.append(role)

    pages = (total + page_size - 1) // page_size if page_size > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


async def update_role(
    db: AsyncSession, role_id: int, data: RoleUpdate, current_user: User | None = None
) -> Role:
    role = await get_role(db, role_id)
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system role",
        )
    update_data = data.model_dump(exclude_unset=True)
    old_values = {k: getattr(role, k) for k in update_data}
    for field, value in update_data.items():
        setattr(role, field, value)
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="update",
            module="admin",
            entity_type="role",
            entity_id=role.id,
            description=f"Updated role '{role.label}'",
            old_values=old_values,
            new_values=update_data,
        )
    return await get_role(db, role_id)


async def delete_role(
    db: AsyncSession, role_id: int, current_user: User | None = None
) -> None:
    role = await get_role(db, role_id)
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system role",
        )
    # Check if any users are assigned to this role
    user_count_result = await db.execute(
        select(func.count(User.id)).where(User.role_id == role_id)
    )
    user_count = user_count_result.scalar() or 0
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete role with {user_count} assigned user(s)",
        )
    role_label = role.label
    role_id_val = role.id
    await db.delete(role)
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="delete",
            module="admin",
            entity_type="role",
            entity_id=role_id_val,
            description=f"Deleted role '{role_label}'",
        )
