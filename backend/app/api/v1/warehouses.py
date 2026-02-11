from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import (
    StockLocationCreate,
    StockLocationRead,
    StockLocationUpdate,
    WarehouseCreate,
    WarehouseRead,
    WarehouseUpdate,
)
from app.services.warehouse import (
    create_location,
    create_warehouse,
    delete_location,
    get_warehouse,
    list_locations,
    list_warehouses,
    update_location,
    update_warehouse,
)

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


# --- Warehouses ---


@router.get("", response_model=dict)
async def list_warehouses_endpoint(
    company_id: int = Query(...),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_warehouses(
        db, company_id, search=search, is_active=is_active, page=page, page_size=page_size,
    )
    result["items"] = [WarehouseRead.model_validate(w) for w in result["items"]]
    return result


@router.post("", response_model=WarehouseRead, status_code=201)
async def create_warehouse_endpoint(
    body: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    warehouse = await create_warehouse(db, body, current_user)
    return WarehouseRead.model_validate(warehouse)


@router.get("/{warehouse_id}", response_model=WarehouseRead)
async def get_warehouse_endpoint(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    warehouse = await get_warehouse(db, warehouse_id)
    return WarehouseRead.model_validate(warehouse)


@router.patch("/{warehouse_id}", response_model=WarehouseRead)
async def update_warehouse_endpoint(
    warehouse_id: int,
    body: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    warehouse = await update_warehouse(db, warehouse_id, body, current_user)
    return WarehouseRead.model_validate(warehouse)


# --- Locations ---


@router.get("/{warehouse_id}/locations", response_model=dict)
async def list_locations_endpoint(
    warehouse_id: int,
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_locations(
        db, warehouse_id, is_active=is_active, page=page, page_size=page_size,
    )
    result["items"] = [StockLocationRead.model_validate(l) for l in result["items"]]
    return result


@router.post("/{warehouse_id}/locations", response_model=StockLocationRead, status_code=201)
async def create_location_endpoint(
    warehouse_id: int,
    body: StockLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    location = await create_location(db, warehouse_id, body, current_user)
    return StockLocationRead.model_validate(location)


@router.patch("/locations/{location_id}", response_model=StockLocationRead)
async def update_location_endpoint(
    location_id: int,
    body: StockLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    location = await update_location(db, location_id, body, current_user)
    return StockLocationRead.model_validate(location)


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location_endpoint(
    location_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.delete")),
):
    await delete_location(db, location_id, current_user)
