from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from decimal import Decimal

from app.schemas.stock import LotCreate, LotRead, LotReadWithStock, LotUpdate
from app.services.lot import create_lot, get_lot, list_lots, update_lot

router = APIRouter(prefix="/lots", tags=["Lots"])


@router.get("", response_model=dict)
async def list_lots_endpoint(
    company_id: int = Query(...),
    product_id: int | None = Query(None),
    is_expired: bool | None = Query(None),
    expiring_within_days: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_lots(
        db, company_id,
        product_id=product_id, is_expired=is_expired,
        expiring_within_days=expiring_within_days,
        search=search, page=page, page_size=page_size,
    )
    stock_map = result.pop("stock_map", {})
    items = []
    for lot in result["items"]:
        lot_data = LotReadWithStock.model_validate(lot)
        qty, reserved = stock_map.get(lot.id, (Decimal(0), Decimal(0)))
        lot_data.total_quantity = qty
        lot_data.total_reserved = reserved
        lot_data.total_available = qty - reserved
        items.append(lot_data)
    result["items"] = items
    return result


@router.post("", response_model=LotRead, status_code=201)
async def create_lot_endpoint(
    body: LotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    lot = await create_lot(db, body, current_user)
    return LotRead.model_validate(lot)


@router.get("/{lot_id}", response_model=LotRead)
async def get_lot_endpoint(
    lot_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    lot = await get_lot(db, lot_id)
    return LotRead.model_validate(lot)


@router.patch("/{lot_id}", response_model=LotRead)
async def update_lot_endpoint(
    lot_id: int,
    body: LotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    lot = await update_lot(db, lot_id, body, current_user)
    return LotRead.model_validate(lot)
