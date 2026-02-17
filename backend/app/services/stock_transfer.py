from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import (
    StockLevel,
    StockLocation,
    StockMovement,
    StockTransfer,
    StockTransferLine,
)
from app.models.user import User
from app.schemas.stock import (
    StockTransferCreate,
    StockTransferUpdate,
    TransferReceiveBody,
    TransferShipBody,
)
from app.services.audit import log_action
from app.services.stock_movement import _get_or_create_stock_level, _generate_reference as _generate_mov_reference
from app.utils.pagination import paginate


async def _generate_reference(db: AsyncSession) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"TRF-{today}-"
    result = await db.execute(
        select(func.count(StockTransfer.id)).where(
            StockTransfer.reference.like(f"{prefix}%")
        )
    )
    count = (result.scalar() or 0) + 1
    return f"{prefix}{count:04d}"


async def _get_default_location(db: AsyncSession, warehouse_id: int) -> StockLocation:
    """Get the first active location of a warehouse."""
    result = await db.execute(
        select(StockLocation)
        .where(
            StockLocation.warehouse_id == warehouse_id,
            StockLocation.is_active.is_(True),
        )
        .order_by(StockLocation.id)
        .limit(1)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active location found for warehouse {warehouse_id}",
        )
    return location


async def create_transfer(
    db: AsyncSession, data: StockTransferCreate, current_user: User
) -> StockTransfer:
    if data.source_warehouse_id == data.destination_warehouse_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination warehouses must be different",
        )
    reference = await _generate_reference(db)
    transfer = StockTransfer(
        reference=reference,
        source_warehouse_id=data.source_warehouse_id,
        destination_warehouse_id=data.destination_warehouse_id,
        status="draft",
        transfer_date=data.transfer_date,
        expected_arrival_date=data.expected_arrival_date,
        notes=data.notes,
        created_by_id=current_user.id,
        company_id=data.company_id,
    )
    db.add(transfer)
    await db.flush()

    for line_data in data.lines:
        line = StockTransferLine(
            transfer_id=transfer.id,
            product_id=line_data.product_id,
            lot_id=line_data.lot_id,
            quantity_sent=line_data.quantity_sent,
        )
        db.add(line)
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        description=f"Created transfer {reference} (source WH {data.source_warehouse_id} → dest WH {data.destination_warehouse_id})",
    )
    return await get_transfer(db, transfer.id)


async def get_transfer(db: AsyncSession, transfer_id: int) -> StockTransfer:
    result = await db.execute(
        select(StockTransfer)
        .options(
            selectinload(StockTransfer.source_warehouse),
            selectinload(StockTransfer.destination_warehouse),
            selectinload(StockTransfer.created_by),
            selectinload(StockTransfer.lines).selectinload(StockTransferLine.product),
            selectinload(StockTransfer.lines).selectinload(StockTransferLine.lot),
        )
        .where(StockTransfer.id == transfer_id)
    )
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found"
        )
    return transfer


async def list_transfers(
    db: AsyncSession,
    company_id: int,
    *,
    status_filter: str | None = None,
    warehouse_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(StockTransfer)
        .options(
            selectinload(StockTransfer.source_warehouse),
            selectinload(StockTransfer.destination_warehouse),
            selectinload(StockTransfer.created_by),
        )
        .where(StockTransfer.company_id == company_id)
        .order_by(StockTransfer.created_at.desc())
    )
    if status_filter:
        query = query.where(StockTransfer.status == status_filter)
    if warehouse_id:
        query = query.where(
            (StockTransfer.source_warehouse_id == warehouse_id)
            | (StockTransfer.destination_warehouse_id == warehouse_id)
        )
    if search:
        query = query.where(
            StockTransfer.reference.ilike(f"%{search}%")
            | StockTransfer.transporter.ilike(f"%{search}%")
        )
    return await paginate(db, query, page, page_size)


async def update_transfer(
    db: AsyncSession, transfer_id: int, data: StockTransferUpdate, current_user: User
) -> StockTransfer:
    transfer = await get_transfer(db, transfer_id)
    if transfer.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update draft transfers",
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transfer, field, value)
    await db.flush()
    return await get_transfer(db, transfer_id)


async def validate_transfer(
    db: AsyncSession, transfer_id: int, current_user: User
) -> StockTransfer:
    """Draft → validated: decrement source stock, create out movements."""
    transfer = await get_transfer(db, transfer_id)
    if transfer.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only validate a draft transfer",
        )
    if not transfer.lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer must have at least one line",
        )

    source_location = await _get_default_location(db, transfer.source_warehouse_id)

    for line in transfer.lines:
        # Check and decrement source stock
        sl = await _get_or_create_stock_level(
            db, line.product_id, source_location.id, line.lot_id, transfer.company_id
        )
        available = sl.quantity - sl.reserved_quantity
        if available < line.quantity_sent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product {line.product_id}. Available: {available}, Requested: {line.quantity_sent}",
            )
        sl.quantity -= line.quantity_sent

        # Create out movement
        mov_ref = await _generate_mov_reference(db)
        movement = StockMovement(
            reference=mov_ref,
            movement_type="out",
            product_id=line.product_id,
            lot_id=line.lot_id,
            source_location_id=source_location.id,
            quantity=line.quantity_sent,
            status="validated",
            reason=f"Transfer {transfer.reference} - outgoing",
            validated_by_id=current_user.id,
            validated_at=datetime.now(),
            company_id=transfer.company_id,
        )
        db.add(movement)

    transfer.status = "validated"
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="validate",
        module="stock",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        description=f"Validated transfer {transfer.reference}",
    )
    return await get_transfer(db, transfer_id)


async def ship_transfer(
    db: AsyncSession, transfer_id: int, body: TransferShipBody, current_user: User
) -> StockTransfer:
    """Validated → in_transit: set transporter info."""
    transfer = await get_transfer(db, transfer_id)
    if transfer.status != "validated":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only ship a validated transfer",
        )
    if body.transporter:
        transfer.transporter = body.transporter
    if body.tracking_number:
        transfer.tracking_number = body.tracking_number
    transfer.status = "in_transit"
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="ship",
        module="stock",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        description=f"Shipped transfer {transfer.reference}",
    )
    return await get_transfer(db, transfer_id)


async def receive_transfer(
    db: AsyncSession, transfer_id: int, body: TransferReceiveBody, current_user: User
) -> StockTransfer:
    """In_transit → received: increment dest stock, create in movements."""
    transfer = await get_transfer(db, transfer_id)
    if transfer.status != "in_transit":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only receive an in-transit transfer",
        )

    dest_location = await _get_default_location(db, transfer.destination_warehouse_id)

    # Build received quantities map
    received_map = {rl.line_id: rl.quantity_received for rl in body.lines}

    for line in transfer.lines:
        qty_received = received_map.get(line.id, line.quantity_sent)
        line.quantity_received = qty_received

        # Increment destination stock
        sl = await _get_or_create_stock_level(
            db, line.product_id, dest_location.id, line.lot_id, transfer.company_id
        )
        sl.quantity += qty_received

        # Create in movement
        mov_ref = await _generate_mov_reference(db)
        movement = StockMovement(
            reference=mov_ref,
            movement_type="in",
            product_id=line.product_id,
            lot_id=line.lot_id,
            destination_location_id=dest_location.id,
            quantity=qty_received,
            status="validated",
            reason=f"Transfer {transfer.reference} - incoming",
            validated_by_id=current_user.id,
            validated_at=datetime.now(),
            company_id=transfer.company_id,
        )
        db.add(movement)

        # If discrepancy, create adjustment movement for the difference
        diff = line.quantity_sent - qty_received
        if diff > 0:
            adj_ref = await _generate_mov_reference(db)
            adj_movement = StockMovement(
                reference=adj_ref,
                movement_type="adjustment",
                product_id=line.product_id,
                lot_id=line.lot_id,
                destination_location_id=dest_location.id,
                quantity=qty_received,
                status="validated",
                reason=f"Transfer {transfer.reference} - discrepancy adjustment (sent: {line.quantity_sent}, received: {qty_received})",
                validated_by_id=current_user.id,
                validated_at=datetime.now(),
                company_id=transfer.company_id,
            )
            db.add(adj_movement)

    transfer.status = "received"
    transfer.actual_arrival_date = date.today()
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="receive",
        module="stock",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        description=f"Received transfer {transfer.reference}",
    )
    return await get_transfer(db, transfer_id)


async def cancel_transfer(
    db: AsyncSession, transfer_id: int, current_user: User
) -> StockTransfer:
    transfer = await get_transfer(db, transfer_id)
    if transfer.status in ("received", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a transfer with status '{transfer.status}'",
        )

    # Reverse stock if already validated or in_transit (stock was decremented at source)
    if transfer.status in ("validated", "in_transit"):
        source_location = await _get_default_location(db, transfer.source_warehouse_id)
        for line in transfer.lines:
            sl = await _get_or_create_stock_level(
                db, line.product_id, source_location.id, line.lot_id, transfer.company_id
            )
            sl.quantity += line.quantity_sent

    transfer.status = "cancelled"
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="cancel",
        module="stock",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        description=f"Cancelled transfer {transfer.reference}",
    )
    return await get_transfer(db, transfer_id)
