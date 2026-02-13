from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import StockLevel, StockReservation
from app.models.user import User
from app.schemas.stock import StockReservationCreate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def _get_available_stock(
    db: AsyncSession,
    product_id: int,
    location_id: int,
    lot_id: int | None,
) -> Decimal:
    """Get available (unreserved) stock for a product/location/lot."""
    query = select(StockLevel).where(
        StockLevel.product_id == product_id,
        StockLevel.location_id == location_id,
        StockLevel.lot_id == lot_id if lot_id else StockLevel.lot_id.is_(None),
    )
    result = await db.execute(query)
    sl = result.scalar_one_or_none()
    if not sl:
        return Decimal(0)
    return sl.available_quantity


async def _update_reserved_quantity(
    db: AsyncSession,
    product_id: int,
    location_id: int,
    lot_id: int | None,
    delta: Decimal,
) -> None:
    """Update reserved_quantity on StockLevel by delta (+/-)."""
    query = select(StockLevel).where(
        StockLevel.product_id == product_id,
        StockLevel.location_id == location_id,
        StockLevel.lot_id == lot_id if lot_id else StockLevel.lot_id.is_(None),
    )
    result = await db.execute(query)
    sl = result.scalar_one_or_none()
    if sl:
        sl.reserved_quantity = (sl.reserved_quantity or Decimal(0)) + delta
        if sl.reserved_quantity < 0:
            sl.reserved_quantity = Decimal(0)


def _load_options():
    return [
        selectinload(StockReservation.product),
        selectinload(StockReservation.location),
        selectinload(StockReservation.lot),
        selectinload(StockReservation.reserved_by),
    ]


async def create_reservation(
    db: AsyncSession, data: StockReservationCreate, current_user: User
) -> StockReservation:
    if data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be positive",
        )

    available = await _get_available_stock(
        db, data.product_id, data.location_id, data.lot_id
    )
    if available < data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient available stock. Available: {available}, Requested: {data.quantity}",
        )

    reservation = StockReservation(
        **data.model_dump(),
        reserved_by_id=current_user.id,
        status="active",
    )
    db.add(reservation)
    await db.flush()

    # Update StockLevel reserved_quantity
    await _update_reserved_quantity(
        db, data.product_id, data.location_id, data.lot_id, data.quantity
    )

    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="stock_reservation",
        entity_id=reservation.id,
        description=f"Reserved {data.quantity} of product {data.product_id} for {data.reference_type}",
        new_values={"quantity": str(data.quantity), "reference_type": data.reference_type},
    )

    return await get_reservation(db, reservation.id)


async def get_reservation(db: AsyncSession, reservation_id: int) -> StockReservation:
    result = await db.execute(
        select(StockReservation)
        .options(*_load_options())
        .where(StockReservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )
    return reservation


async def list_reservations(
    db: AsyncSession,
    company_id: int,
    *,
    product_id: int | None = None,
    status_filter: str | None = None,
    reference_type: str | None = None,
    reference_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(StockReservation)
        .options(*_load_options())
        .where(StockReservation.company_id == company_id)
        .order_by(StockReservation.created_at.desc())
    )
    if product_id:
        query = query.where(StockReservation.product_id == product_id)
    if status_filter:
        query = query.where(StockReservation.status == status_filter)
    if reference_type:
        query = query.where(StockReservation.reference_type == reference_type)
    if reference_id:
        query = query.where(StockReservation.reference_id == reference_id)
    if search:
        query = query.where(StockReservation.reference_label.ilike(f"%{search}%"))
    return await paginate(db, query, page, page_size)


async def release_reservation(
    db: AsyncSession, reservation_id: int, current_user: User
) -> None:
    reservation = await get_reservation(db, reservation_id)
    if reservation.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot release reservation with status '{reservation.status}'",
        )

    reservation.status = "released"
    await _update_reserved_quantity(
        db,
        reservation.product_id,
        reservation.location_id,
        reservation.lot_id,
        -reservation.quantity,
    )
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="release",
        module="stock",
        entity_type="stock_reservation",
        entity_id=reservation.id,
        description=f"Released reservation #{reservation.id}",
    )


async def release_by_reference(
    db: AsyncSession,
    reference_type: str,
    reference_id: int,
    current_user: User,
) -> int:
    """Release all active reservations for a given reference. Returns count released."""
    result = await db.execute(
        select(StockReservation).where(
            StockReservation.reference_type == reference_type,
            StockReservation.reference_id == reference_id,
            StockReservation.status == "active",
        )
    )
    reservations = list(result.scalars().all())
    count = 0
    for r in reservations:
        r.status = "released"
        await _update_reserved_quantity(
            db, r.product_id, r.location_id, r.lot_id, -r.quantity
        )
        count += 1

    if count:
        await db.flush()
        await log_action(
            db,
            user=current_user,
            action="release_batch",
            module="stock",
            entity_type="stock_reservation",
            description=f"Released {count} reservations for {reference_type} #{reference_id}",
            new_values={"reference_type": reference_type, "reference_id": reference_id, "count": count},
        )

    return count


async def release_expired_reservations(db: AsyncSession) -> int:
    """Release all expired active reservations. Called by scheduler."""
    from datetime import datetime

    result = await db.execute(
        select(StockReservation).where(
            StockReservation.status == "active",
            StockReservation.expiry_date.isnot(None),
            StockReservation.expiry_date <= datetime.now(),
        )
    )
    reservations = list(result.scalars().all())
    count = 0
    for r in reservations:
        r.status = "expired"
        await _update_reserved_quantity(
            db, r.product_id, r.location_id, r.lot_id, -r.quantity
        )
        count += 1

    if count:
        await db.flush()

    return count
