from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.utils.pagination import paginate


async def create_company(db: AsyncSession, data: CompanyCreate) -> Company:
    company = Company(**data.model_dump())
    db.add(company)
    await db.flush()
    return company


async def get_company(db: AsyncSession, company_id: int) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


async def list_companies(db: AsyncSession, page: int = 1, page_size: int = 20) -> dict:
    query = select(Company).where(Company.is_active.is_(True)).order_by(Company.name)
    return await paginate(db, query, page, page_size)


async def update_company(
    db: AsyncSession, company_id: int, data: CompanyUpdate
) -> Company:
    company = await get_company(db, company_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    await db.flush()
    return company
