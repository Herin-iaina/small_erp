from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.services.traceability import (
    get_lot_traceability,
    get_product_movement_history,
    get_stock_snapshot,
)

router = APIRouter(prefix="/stock", tags=["Stock Traceability"])


@router.get("/products/{product_id}/movement-history", response_model=dict)
async def product_movement_history_endpoint(
    product_id: int,
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    movement_type: str | None = Query(None),
    location_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_product_movement_history(
        db,
        product_id,
        date_from=date_from,
        date_to=date_to,
        movement_type=movement_type,
        location_id=location_id,
        page=page,
        page_size=page_size,
    )


@router.get("/lots/{lot_id}/traceability", response_model=dict)
async def lot_traceability_endpoint(
    lot_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_lot_traceability(db, lot_id)


@router.get("/snapshot", response_model=list[dict])
async def stock_snapshot_endpoint(
    company_id: int = Query(...),
    date: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_stock_snapshot(db, company_id, date)
