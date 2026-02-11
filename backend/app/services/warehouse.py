from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import StockLevel, StockLocation, Warehouse
from app.models.user import User
from app.schemas.stock import (
    StockLocationCreate,
    StockLocationUpdate,
    WarehouseCreate,
    WarehouseUpdate,
)
from app.services.audit import log_action
from app.utils.pagination import paginate


# --- Warehouse ---


async def create_warehouse(
    db: AsyncSession, data: WarehouseCreate, current_user: User
) -> Warehouse:
    existing = await db.execute(
        select(Warehouse).where(
            Warehouse.code == data.code,
            Warehouse.company_id == data.company_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Warehouse code '{data.code}' already exists for this company",
        )
    warehouse = Warehouse(**data.model_dump())
    db.add(warehouse)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="warehouse",
        entity_id=warehouse.id,
        description=f"Created warehouse '{warehouse.name}'",
        new_values=data.model_dump(),
    )
    return await get_warehouse(db, warehouse.id)


async def get_warehouse(db: AsyncSession, warehouse_id: int) -> Warehouse:
    result = await db.execute(
        select(Warehouse)
        .options(selectinload(Warehouse.locations))
        .where(Warehouse.id == warehouse_id)
    )
    warehouse = result.scalar_one_or_none()
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found"
        )
    return warehouse


async def list_warehouses(
    db: AsyncSession,
    company_id: int,
    *,
    search: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(Warehouse)
        .where(Warehouse.company_id == company_id)
        .order_by(Warehouse.name)
    )
    if is_active is not None:
        query = query.where(Warehouse.is_active.is_(is_active))
    if search:
        query = query.where(
            Warehouse.name.ilike(f"%{search}%")
            | Warehouse.code.ilike(f"%{search}%")
        )
    return await paginate(db, query, page, page_size)


async def update_warehouse(
    db: AsyncSession,
    warehouse_id: int,
    data: WarehouseUpdate,
    current_user: User,
) -> Warehouse:
    warehouse = await get_warehouse(db, warehouse_id)
    old_values = {
        k: getattr(warehouse, k) for k in data.model_dump(exclude_unset=True)
    }
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(warehouse, field, value)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="update",
        module="stock",
        entity_type="warehouse",
        entity_id=warehouse.id,
        description=f"Updated warehouse '{warehouse.name}'",
        old_values=old_values,
        new_values=update_data,
    )
    return await get_warehouse(db, warehouse_id)


# --- StockLocation ---


async def create_location(
    db: AsyncSession, warehouse_id: int, data: StockLocationCreate, current_user: User
) -> StockLocation:
    await get_warehouse(db, warehouse_id)
    location = StockLocation(**data.model_dump(), warehouse_id=warehouse_id)
    db.add(location)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="stock_location",
        entity_id=location.id,
        description=f"Created location '{location.name}' in warehouse #{warehouse_id}",
        new_values=data.model_dump(),
    )
    return await get_location(db, location.id)


async def get_location(db: AsyncSession, location_id: int) -> StockLocation:
    result = await db.execute(
        select(StockLocation).where(StockLocation.id == location_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )
    return location


async def list_locations(
    db: AsyncSession,
    warehouse_id: int,
    *,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(StockLocation)
        .where(StockLocation.warehouse_id == warehouse_id)
        .order_by(StockLocation.code)
    )
    if is_active is not None:
        query = query.where(StockLocation.is_active.is_(is_active))
    return await paginate(db, query, page, page_size)


async def update_location(
    db: AsyncSession,
    location_id: int,
    data: StockLocationUpdate,
    current_user: User,
) -> StockLocation:
    location = await get_location(db, location_id)
    old_values = {
        k: getattr(location, k) for k in data.model_dump(exclude_unset=True)
    }
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="update",
        module="stock",
        entity_type="stock_location",
        entity_id=location.id,
        description=f"Updated location '{location.name}'",
        old_values=old_values,
        new_values=update_data,
    )
    return await get_location(db, location_id)


async def delete_location(
    db: AsyncSession, location_id: int, current_user: User
) -> None:
    location = await get_location(db, location_id)
    # Check if stock levels exist
    result = await db.execute(
        select(StockLevel.id).where(StockLevel.location_id == location_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete location with existing stock levels",
        )
    await log_action(
        db,
        user=current_user,
        action="delete",
        module="stock",
        entity_type="stock_location",
        entity_id=location.id,
        description=f"Deleted location '{location.name}'",
    )
    await db.delete(location)
