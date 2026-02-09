from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate
from app.utils.pagination import paginate


async def create_role(db: AsyncSession, data: RoleCreate) -> Role:
    role = Role(**data.model_dump())
    db.add(role)
    await db.flush()
    return role


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
    query = select(Role).order_by(Role.name)
    if company_id is not None:
        query = query.where(
            (Role.company_id == company_id) | (Role.company_id.is_(None))
        )
    return await paginate(db, query, page, page_size)


async def update_role(db: AsyncSession, role_id: int, data: RoleUpdate) -> Role:
    role = await get_role(db, role_id)
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system role",
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    await db.flush()
    return role


async def delete_role(db: AsyncSession, role_id: int) -> None:
    role = await get_role(db, role_id)
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system role",
        )
    await db.delete(role)
