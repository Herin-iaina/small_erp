from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import (
    UnitOfMeasureCreate,
    UnitOfMeasureRead,
    UnitOfMeasureUpdate,
)
from app.services.uom import (
    create_uom,
    get_conversions,
    get_uom,
    list_uoms,
    seed_default_uoms,
    update_uom,
)

router = APIRouter(prefix="/units", tags=["Units of Measure"])


@router.get("", response_model=dict)
async def list_uoms_endpoint(
    company_id: int = Query(...),
    category: str | None = Query(None),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_uoms(
        db, company_id,
        category=category, search=search, is_active=is_active,
        page=page, page_size=page_size,
    )
    result["items"] = [UnitOfMeasureRead.model_validate(i) for i in result["items"]]
    return result


@router.post("", response_model=UnitOfMeasureRead, status_code=201)
async def create_uom_endpoint(
    body: UnitOfMeasureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    uom = await create_uom(db, body, current_user)
    return UnitOfMeasureRead.model_validate(uom)


@router.get("/{uom_id}", response_model=UnitOfMeasureRead)
async def get_uom_endpoint(
    uom_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    uom = await get_uom(db, uom_id)
    return UnitOfMeasureRead.model_validate(uom)


@router.patch("/{uom_id}", response_model=UnitOfMeasureRead)
async def update_uom_endpoint(
    uom_id: int,
    body: UnitOfMeasureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    uom = await update_uom(db, uom_id, body, current_user)
    return UnitOfMeasureRead.model_validate(uom)


@router.get("/{uom_id}/conversions", response_model=list[dict])
async def get_conversions_endpoint(
    uom_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_conversions(db, uom_id)


@router.post("/seed", response_model=list[UnitOfMeasureRead], status_code=201)
async def seed_uoms_endpoint(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    created = await seed_default_uoms(db, company_id, current_user)
    return [UnitOfMeasureRead.model_validate(u) for u in created]
