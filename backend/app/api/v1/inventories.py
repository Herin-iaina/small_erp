from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import InventoryCreate, InventoryLineUpdate, InventoryRead
from app.services.inventory import (
    cancel_inventory,
    create_inventory,
    get_inventory,
    list_inventories,
    start_inventory,
    update_inventory_line,
    validate_inventory,
)

router = APIRouter(prefix="/inventories", tags=["Inventories"])


@router.get("", response_model=dict)
async def list_inventories_endpoint(
    company_id: int = Query(...),
    status: str | None = Query(None),
    warehouse_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_inventories(
        db, company_id,
        status_filter=status, warehouse_id=warehouse_id,
        search=search, page=page, page_size=page_size,
    )
    result["items"] = [InventoryRead.model_validate(i) for i in result["items"]]
    return result


@router.post("", response_model=InventoryRead, status_code=201)
async def create_inventory_endpoint(
    body: InventoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    inventory = await create_inventory(db, body, current_user)
    return InventoryRead.model_validate(inventory)


@router.get("/{inventory_id}", response_model=InventoryRead)
async def get_inventory_endpoint(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    inventory = await get_inventory(db, inventory_id)
    return InventoryRead.model_validate(inventory)


@router.post("/{inventory_id}/start", response_model=InventoryRead)
async def start_inventory_endpoint(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    inventory = await start_inventory(db, inventory_id, current_user)
    return InventoryRead.model_validate(inventory)


@router.patch("/{inventory_id}/lines/{line_id}", response_model=InventoryRead)
async def update_inventory_line_endpoint(
    inventory_id: int,
    line_id: int,
    body: InventoryLineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    inventory = await update_inventory_line(db, inventory_id, line_id, body, current_user)
    return InventoryRead.model_validate(inventory)


@router.post("/{inventory_id}/validate", response_model=InventoryRead)
async def validate_inventory_endpoint(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    inventory = await validate_inventory(db, inventory_id, current_user)
    return InventoryRead.model_validate(inventory)


@router.post("/{inventory_id}/cancel", response_model=InventoryRead)
async def cancel_inventory_endpoint(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    inventory = await cancel_inventory(db, inventory_id, current_user)
    return InventoryRead.model_validate(inventory)
