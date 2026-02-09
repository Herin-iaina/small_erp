from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate
from app.services.company import (
    create_company,
    get_company,
    list_companies,
    toggle_company_status,
    update_company,
)

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("", response_model=dict)
async def list_companies_endpoint(
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.view")),
):
    result = await list_companies(
        db, page=page, page_size=page_size, search=search, is_active=is_active
    )
    result["items"] = [CompanyRead.model_validate(c) for c in result["items"]]
    return result


@router.post("", response_model=CompanyRead, status_code=201)
async def create_company_endpoint(
    body: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("admin.create")),
):
    company = await create_company(db, body, current_user=current_user)
    return CompanyRead.model_validate(company)


@router.get("/{company_id}", response_model=CompanyRead)
async def get_company_endpoint(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.view")),
):
    company = await get_company(db, company_id)
    return CompanyRead.model_validate(company)


@router.patch("/{company_id}", response_model=CompanyRead)
async def update_company_endpoint(
    company_id: int,
    body: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("admin.edit")),
):
    company = await update_company(db, company_id, body, current_user=current_user)
    return CompanyRead.model_validate(company)


@router.post("/{company_id}/toggle-status", response_model=CompanyRead)
async def toggle_company_status_endpoint(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("admin.edit")),
):
    company = await toggle_company_status(db, company_id, current_user=current_user)
    return CompanyRead.model_validate(company)
