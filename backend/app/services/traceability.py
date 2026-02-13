from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Lot, Product, StockLevel, StockMovement


async def get_product_movement_history(
    db: AsyncSession,
    product_id: int,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    movement_type: str | None = None,
    location_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Get all validated movements for a product with running stock total."""
    from app.utils.pagination import paginate
    from app.schemas.stock import StockMovementRead

    query = (
        select(StockMovement)
        .options(
            selectinload(StockMovement.product),
            selectinload(StockMovement.lot),
            selectinload(StockMovement.source_location),
            selectinload(StockMovement.destination_location),
            selectinload(StockMovement.validated_by),
        )
        .where(
            StockMovement.product_id == product_id,
            StockMovement.status == "validated",
        )
        .order_by(StockMovement.validated_at.desc())
    )

    if date_from:
        query = query.where(StockMovement.validated_at >= date_from)
    if date_to:
        query = query.where(StockMovement.validated_at <= date_to)
    if movement_type:
        query = query.where(StockMovement.movement_type == movement_type)
    if location_id:
        query = query.where(
            (StockMovement.source_location_id == location_id)
            | (StockMovement.destination_location_id == location_id)
        )

    result = await paginate(db, query, page, page_size)
    result["items"] = [StockMovementRead.model_validate(m) for m in result["items"]]
    return result


async def get_lot_traceability(
    db: AsyncSession, lot_id: int
) -> dict:
    """Complete traceability for a lot: origin, destinations, locations timeline."""
    lot_result = await db.execute(
        select(Lot)
        .options(
            selectinload(Lot.product),
            selectinload(Lot.supplier),
        )
        .where(Lot.id == lot_id)
    )
    lot = lot_result.scalar_one_or_none()
    if not lot:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lot not found")

    # Get all movements involving this lot
    movements_result = await db.execute(
        select(StockMovement)
        .options(
            selectinload(StockMovement.product),
            selectinload(StockMovement.source_location),
            selectinload(StockMovement.destination_location),
            selectinload(StockMovement.validated_by),
        )
        .where(
            StockMovement.lot_id == lot_id,
            StockMovement.status == "validated",
        )
        .order_by(StockMovement.validated_at.asc())
    )
    movements = list(movements_result.scalars().all())

    # Current stock levels for this lot
    stock_result = await db.execute(
        select(StockLevel)
        .options(selectinload(StockLevel.location))
        .where(StockLevel.lot_id == lot_id, StockLevel.quantity > 0)
    )
    stock_levels = list(stock_result.scalars().all())

    from app.schemas.stock import StockMovementRead

    return {
        "lot": {
            "id": lot.id,
            "lot_number": lot.lot_number,
            "manufacturing_date": lot.manufacturing_date.isoformat() if lot.manufacturing_date else None,
            "expiry_date": lot.expiry_date.isoformat() if lot.expiry_date else None,
            "best_before_date": lot.best_before_date.isoformat() if lot.best_before_date else None,
            "notes": lot.notes,
        },
        "product": {
            "id": lot.product.id,
            "sku": lot.product.sku,
            "name": lot.product.name,
        } if lot.product else None,
        "supplier": {
            "id": lot.supplier.id,
            "name": lot.supplier.name,
            "code": lot.supplier.code,
        } if lot.supplier else None,
        "movements": [StockMovementRead.model_validate(m) for m in movements],
        "current_locations": [
            {
                "location_id": sl.location_id,
                "location_name": sl.location.name if sl.location else None,
                "quantity": sl.quantity,
                "reserved_quantity": sl.reserved_quantity,
            }
            for sl in stock_levels
        ],
        "total_in": sum(m.quantity for m in movements if m.movement_type == "in"),
        "total_out": sum(m.quantity for m in movements if m.movement_type == "out"),
    }


async def get_stock_snapshot(
    db: AsyncSession,
    company_id: int,
    snapshot_date: datetime,
) -> list[dict]:
    """Reconstruct stock state at a given date by replaying validated movements."""
    # Get all validated movements up to snapshot_date
    result = await db.execute(
        select(StockMovement)
        .options(selectinload(StockMovement.product))
        .where(
            StockMovement.company_id == company_id,
            StockMovement.status == "validated",
            StockMovement.validated_at <= snapshot_date,
        )
        .order_by(StockMovement.validated_at.asc())
    )
    movements = list(result.scalars().all())

    # Replay movements to reconstruct stock
    stock: dict[int, dict] = {}  # product_id -> {name, sku, quantity}

    for m in movements:
        pid = m.product_id
        if pid not in stock:
            stock[pid] = {
                "product_id": pid,
                "product_name": m.product.name if m.product else f"#{pid}",
                "sku": m.product.sku if m.product else "",
                "quantity": Decimal(0),
            }

        if m.movement_type == "in":
            stock[pid]["quantity"] += m.quantity
        elif m.movement_type == "out":
            stock[pid]["quantity"] -= m.quantity
        elif m.movement_type == "adjustment":
            stock[pid]["quantity"] = m.quantity
        # transfer doesn't change total stock

    return [v for v in stock.values() if v["quantity"] != 0]
