from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import (
    InventoryCycleCreate,
    InventoryCycleGenerateBody,
    InventoryCycleListRead,
    InventoryCycleRead,
)
from app.services.inventory_cycle import (
    complete_cycle,
    create_cycle,
    generate_cycles,
    get_cycle,
    list_cycles,
    start_cycle,
)

router = APIRouter(prefix="/inventory-cycles", tags=["Inventory Cycles"])


@router.get("", response_model=dict)
async def list_cycles_endpoint(
    company_id: int = Query(...),
    status: str | None = Query(None),
    warehouse_id: int | None = Query(None),
    frequency: str | None = Query(None),
    classification: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_cycles(
        db, company_id,
        status_filter=status, warehouse_id=warehouse_id,
        frequency=frequency, classification=classification,
        page=page, page_size=page_size,
    )
    result["items"] = [InventoryCycleListRead.model_validate(i) for i in result["items"]]
    return result


@router.post("", response_model=InventoryCycleRead, status_code=201)
async def create_cycle_endpoint(
    body: InventoryCycleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    cycle = await create_cycle(db, body, current_user)
    return InventoryCycleRead.model_validate(cycle)


@router.post("/generate", response_model=list[InventoryCycleRead], status_code=201)
async def generate_cycles_endpoint(
    body: InventoryCycleGenerateBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    cycles = await generate_cycles(db, body, current_user)
    return [InventoryCycleRead.model_validate(c) for c in cycles]


@router.get("/{cycle_id}", response_model=InventoryCycleRead)
async def get_cycle_endpoint(
    cycle_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    cycle = await get_cycle(db, cycle_id)
    return InventoryCycleRead.model_validate(cycle)


@router.post("/{cycle_id}/start", response_model=InventoryCycleRead)
async def start_cycle_endpoint(
    cycle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    cycle = await start_cycle(db, cycle_id, current_user)
    return InventoryCycleRead.model_validate(cycle)


@router.post("/{cycle_id}/complete", response_model=InventoryCycleRead)
async def complete_cycle_endpoint(
    cycle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    cycle = await complete_cycle(db, cycle_id, current_user)
    return InventoryCycleRead.model_validate(cycle)
