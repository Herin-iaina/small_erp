from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import StockMovementCreate, StockMovementRead, StockMovementUpdate
from app.services.stock_movement import (
    cancel_movement,
    create_movement,
    get_fifo_order,
    get_movement,
    list_movements,
    update_movement,
    validate_movement,
)

router = APIRouter(prefix="/stock-movements", tags=["Stock Movements"])


@router.get("", response_model=dict)
async def list_movements_endpoint(
    company_id: int = Query(...),
    movement_type: str | None = Query(None),
    status: str | None = Query(None),
    product_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_movements(
        db, company_id,
        movement_type=movement_type, status_filter=status,
        product_id=product_id, search=search,
        page=page, page_size=page_size,
    )
    result["items"] = [StockMovementRead.model_validate(m) for m in result["items"]]
    return result


@router.post("", response_model=StockMovementRead, status_code=201)
async def create_movement_endpoint(
    body: StockMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    movement = await create_movement(db, body, current_user)
    return StockMovementRead.model_validate(movement)


@router.get("/{movement_id}", response_model=StockMovementRead)
async def get_movement_endpoint(
    movement_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    movement = await get_movement(db, movement_id)
    return StockMovementRead.model_validate(movement)


@router.patch("/{movement_id}", response_model=StockMovementRead)
async def update_movement_endpoint(
    movement_id: int,
    body: StockMovementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    movement = await update_movement(db, movement_id, body, current_user)
    return StockMovementRead.model_validate(movement)


@router.post("/{movement_id}/validate", response_model=StockMovementRead)
async def validate_movement_endpoint(
    movement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    movement = await validate_movement(db, movement_id, current_user)
    return StockMovementRead.model_validate(movement)


@router.post("/{movement_id}/cancel", response_model=StockMovementRead)
async def cancel_movement_endpoint(
    movement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    movement = await cancel_movement(db, movement_id, current_user)
    return StockMovementRead.model_validate(movement)
