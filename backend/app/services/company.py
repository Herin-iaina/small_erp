from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def create_company(
    db: AsyncSession, data: CompanyCreate, current_user: User | None = None
) -> Company:
    company = Company(**data.model_dump())
    db.add(company)
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="create",
            module="admin",
            entity_type="company",
            entity_id=company.id,
            description=f"Created company '{company.name}'",
            new_values=data.model_dump(),
        )
    return company


async def get_company(db: AsyncSession, company_id: int) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


async def list_companies(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
) -> dict:
    query = select(Company).order_by(Company.name)
    if is_active is not None:
        query = query.where(Company.is_active.is_(is_active))
    if search:
        query = query.where(Company.name.ilike(f"%{search}%"))
    return await paginate(db, query, page, page_size)


async def update_company(
    db: AsyncSession,
    company_id: int,
    data: CompanyUpdate,
    current_user: User | None = None,
) -> Company:
    company = await get_company(db, company_id)
    old_values = {
        k: getattr(company, k)
        for k in data.model_dump(exclude_unset=True)
    }
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="update",
            module="admin",
            entity_type="company",
            entity_id=company.id,
            description=f"Updated company '{company.name}'",
            old_values=old_values,
            new_values=update_data,
        )
    return company


async def toggle_company_status(
    db: AsyncSession, company_id: int, current_user: User | None = None
) -> Company:
    company = await get_company(db, company_id)
    old_status = company.is_active
    company.is_active = not company.is_active
    await db.flush()
    if current_user:
        await log_action(
            db,
            user=current_user,
            action="toggle_status",
            module="admin",
            entity_type="company",
            entity_id=company.id,
            description=f"{'Activated' if company.is_active else 'Deactivated'} company '{company.name}'",
            old_values={"is_active": old_status},
            new_values={"is_active": company.is_active},
        )
    return company
