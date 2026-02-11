from datetime import datetime, date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Product, StockLevel, StockMovement
from app.models.user import User
from app.schemas.stock import StockMovementCreate, StockMovementUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def _generate_reference(db: AsyncSession) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"MOV-{today}-"
    result = await db.execute(
        select(func.count(StockMovement.id)).where(
            StockMovement.reference.like(f"{prefix}%")
        )
    )
    count = (result.scalar() or 0) + 1
    return f"{prefix}{count:04d}"


async def _get_or_create_stock_level(
    db: AsyncSession,
    product_id: int,
    location_id: int,
    lot_id: int | None,
    company_id: int,
) -> StockLevel:
    result = await db.execute(
        select(StockLevel).where(
            StockLevel.product_id == product_id,
            StockLevel.location_id == location_id,
            StockLevel.lot_id == lot_id if lot_id else StockLevel.lot_id.is_(None),
        )
    )
    sl = result.scalar_one_or_none()
    if sl:
        return sl
    sl = StockLevel(
        product_id=product_id,
        location_id=location_id,
        lot_id=lot_id,
        quantity=Decimal(0),
        reserved_quantity=Decimal(0),
        company_id=company_id,
    )
    db.add(sl)
    await db.flush()
    return sl


def _update_cump(
    product: Product,
    current_total_qty: Decimal,
    incoming_qty: Decimal,
    incoming_unit_cost: Decimal,
) -> None:
    current_cost = product.cost_price or Decimal(0)
    total_old_value = current_total_qty * current_cost
    total_new_value = incoming_qty * incoming_unit_cost
    new_total_qty = current_total_qty + incoming_qty
    if new_total_qty > 0:
        product.cost_price = (total_old_value + total_new_value) / new_total_qty


async def _get_product_total_qty(db: AsyncSession, product_id: int) -> Decimal:
    result = await db.execute(
        select(func.coalesce(func.sum(StockLevel.quantity), 0)).where(
            StockLevel.product_id == product_id
        )
    )
    return result.scalar() or Decimal(0)


async def create_movement(
    db: AsyncSession, data: StockMovementCreate, current_user: User
) -> StockMovement:
    if data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be positive",
        )

    mv_type = data.movement_type
    if mv_type == "in" and not data.destination_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination location required for incoming movement",
        )
    if mv_type == "out" and not data.source_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source location required for outgoing movement",
        )
    if mv_type == "transfer":
        if not data.source_location_id or not data.destination_location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source and destination required for transfer",
            )
    if mv_type == "adjustment" and not data.destination_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination location required for adjustment",
        )

    reference = await _generate_reference(db)
    movement = StockMovement(
        reference=reference,
        movement_type=data.movement_type,
        product_id=data.product_id,
        lot_id=data.lot_id,
        source_location_id=data.source_location_id,
        destination_location_id=data.destination_location_id,
        quantity=data.quantity,
        unit_cost=data.unit_cost,
        status="draft",
        reason=data.reason,
        notes=data.notes,
        company_id=data.company_id,
    )
    db.add(movement)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="stock_movement",
        entity_id=movement.id,
        description=f"Created {data.movement_type} movement {reference}",
        new_values={"reference": reference, "movement_type": data.movement_type, "quantity": str(data.quantity)},
    )
    return await get_movement(db, movement.id)


async def validate_movement(
    db: AsyncSession, movement_id: int, current_user: User
) -> StockMovement:
    movement = await get_movement(db, movement_id)
    if movement.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot validate movement with status '{movement.status}'",
        )

    mv_type = movement.movement_type
    qty = movement.quantity
    company_id = movement.company_id

    if mv_type == "in":
        sl = await _get_or_create_stock_level(
            db, movement.product_id, movement.destination_location_id,
            movement.lot_id, company_id,
        )
        sl.quantity += qty
        # Update CUMP if unit_cost provided
        if movement.unit_cost and movement.unit_cost > 0:
            product = await db.get(Product, movement.product_id)
            total_qty = await _get_product_total_qty(db, movement.product_id)
            # total_qty already includes the qty we just added, subtract it for CUMP calc
            _update_cump(product, total_qty - qty, qty, movement.unit_cost)

    elif mv_type == "out":
        sl = await _get_or_create_stock_level(
            db, movement.product_id, movement.source_location_id,
            movement.lot_id, company_id,
        )
        available = sl.quantity - sl.reserved_quantity
        if available < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock. Available: {available}, Requested: {qty}",
            )
        sl.quantity -= qty

    elif mv_type == "transfer":
        # Remove from source
        sl_src = await _get_or_create_stock_level(
            db, movement.product_id, movement.source_location_id,
            movement.lot_id, company_id,
        )
        available = sl_src.quantity - sl_src.reserved_quantity
        if available < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock at source. Available: {available}, Requested: {qty}",
            )
        sl_src.quantity -= qty
        # Add to destination
        sl_dst = await _get_or_create_stock_level(
            db, movement.product_id, movement.destination_location_id,
            movement.lot_id, company_id,
        )
        sl_dst.quantity += qty

    elif mv_type == "adjustment":
        sl = await _get_or_create_stock_level(
            db, movement.product_id, movement.destination_location_id,
            movement.lot_id, company_id,
        )
        sl.quantity = qty

    movement.status = "validated"
    movement.validated_by_id = current_user.id
    movement.validated_at = datetime.now()
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="validate",
        module="stock",
        entity_type="stock_movement",
        entity_id=movement.id,
        description=f"Validated {mv_type} movement {movement.reference}",
    )
    return await get_movement(db, movement_id)


async def cancel_movement(
    db: AsyncSession, movement_id: int, current_user: User
) -> StockMovement:
    movement = await get_movement(db, movement_id)
    if movement.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Movement is already cancelled",
        )

    # Reverse stock changes if already validated
    if movement.status == "validated":
        mv_type = movement.movement_type
        qty = movement.quantity
        company_id = movement.company_id

        if mv_type == "in":
            sl = await _get_or_create_stock_level(
                db, movement.product_id, movement.destination_location_id,
                movement.lot_id, company_id,
            )
            sl.quantity -= qty

        elif mv_type == "out":
            sl = await _get_or_create_stock_level(
                db, movement.product_id, movement.source_location_id,
                movement.lot_id, company_id,
            )
            sl.quantity += qty

        elif mv_type == "transfer":
            sl_src = await _get_or_create_stock_level(
                db, movement.product_id, movement.source_location_id,
                movement.lot_id, company_id,
            )
            sl_src.quantity += qty
            sl_dst = await _get_or_create_stock_level(
                db, movement.product_id, movement.destination_location_id,
                movement.lot_id, company_id,
            )
            sl_dst.quantity -= qty

    movement.status = "cancelled"
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="cancel",
        module="stock",
        entity_type="stock_movement",
        entity_id=movement.id,
        description=f"Cancelled movement {movement.reference}",
    )
    return await get_movement(db, movement_id)


async def get_movement(db: AsyncSession, movement_id: int) -> StockMovement:
    result = await db.execute(
        select(StockMovement)
        .options(
            selectinload(StockMovement.product),
            selectinload(StockMovement.lot),
            selectinload(StockMovement.source_location),
            selectinload(StockMovement.destination_location),
            selectinload(StockMovement.validated_by),
        )
        .where(StockMovement.id == movement_id)
    )
    movement = result.scalar_one_or_none()
    if not movement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found"
        )
    return movement


async def list_movements(
    db: AsyncSession,
    company_id: int,
    *,
    movement_type: str | None = None,
    status_filter: str | None = None,
    product_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(StockMovement)
        .options(
            selectinload(StockMovement.product),
            selectinload(StockMovement.lot),
            selectinload(StockMovement.source_location),
            selectinload(StockMovement.destination_location),
            selectinload(StockMovement.validated_by),
        )
        .where(StockMovement.company_id == company_id)
        .order_by(StockMovement.created_at.desc())
    )
    if movement_type:
        query = query.where(StockMovement.movement_type == movement_type)
    if status_filter:
        query = query.where(StockMovement.status == status_filter)
    if product_id:
        query = query.where(StockMovement.product_id == product_id)
    if search:
        query = query.where(StockMovement.reference.ilike(f"%{search}%"))
    return await paginate(db, query, page, page_size)


async def update_movement(
    db: AsyncSession, movement_id: int, data: StockMovementUpdate, current_user: User
) -> StockMovement:
    movement = await get_movement(db, movement_id)
    if movement.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update draft movements",
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(movement, field, value)
    await db.flush()
    return await get_movement(db, movement_id)
