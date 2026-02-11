from datetime import datetime, date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import (
    Inventory,
    InventoryLine,
    StockLevel,
    StockLocation,
    StockMovement,
    Product,
)
from app.models.user import User
from app.schemas.stock import InventoryCreate, InventoryLineUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def _generate_reference(db: AsyncSession) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"INV-{today}-"
    result = await db.execute(
        select(func.count(Inventory.id)).where(
            Inventory.reference.like(f"{prefix}%")
        )
    )
    count = (result.scalar() or 0) + 1
    return f"{prefix}{count:04d}"


async def _generate_mov_reference(db: AsyncSession) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"MOV-{today}-"
    result = await db.execute(
        select(func.count(StockMovement.id)).where(
            StockMovement.reference.like(f"{prefix}%")
        )
    )
    count = (result.scalar() or 0) + 1
    return f"{prefix}{count:04d}"


async def create_inventory(
    db: AsyncSession, data: InventoryCreate, current_user: User
) -> Inventory:
    reference = await _generate_reference(db)
    inventory = Inventory(
        reference=reference,
        name=data.name,
        warehouse_id=data.warehouse_id,
        status="draft",
        notes=data.notes,
        created_by_id=current_user.id,
        company_id=data.company_id,
    )
    db.add(inventory)
    await db.flush()

    # Auto-populate lines from stock_levels at warehouse locations
    locations_result = await db.execute(
        select(StockLocation.id).where(
            StockLocation.warehouse_id == data.warehouse_id,
            StockLocation.is_active.is_(True),
        )
    )
    location_ids = [row[0] for row in locations_result.all()]

    if location_ids:
        levels_result = await db.execute(
            select(StockLevel).where(
                StockLevel.location_id.in_(location_ids),
                StockLevel.company_id == data.company_id,
            )
        )
        for sl in levels_result.scalars().all():
            line = InventoryLine(
                inventory_id=inventory.id,
                product_id=sl.product_id,
                location_id=sl.location_id,
                lot_id=sl.lot_id,
                expected_quantity=sl.quantity,
            )
            db.add(line)
        await db.flush()

    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="inventory",
        entity_id=inventory.id,
        description=f"Created inventory session '{inventory.name}' ({reference})",
    )
    return await get_inventory(db, inventory.id)


async def get_inventory(db: AsyncSession, inventory_id: int) -> Inventory:
    result = await db.execute(
        select(Inventory)
        .options(
            selectinload(Inventory.warehouse),
            selectinload(Inventory.created_by),
            selectinload(Inventory.lines).selectinload(InventoryLine.product),
            selectinload(Inventory.lines).selectinload(InventoryLine.location),
            selectinload(Inventory.lines).selectinload(InventoryLine.lot),
        )
        .where(Inventory.id == inventory_id)
    )
    inventory = result.scalar_one_or_none()
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found"
        )
    return inventory


async def list_inventories(
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
        select(Inventory)
        .options(
            selectinload(Inventory.warehouse),
            selectinload(Inventory.created_by),
        )
        .where(Inventory.company_id == company_id)
        .order_by(Inventory.created_at.desc())
    )
    if status_filter:
        query = query.where(Inventory.status == status_filter)
    if warehouse_id:
        query = query.where(Inventory.warehouse_id == warehouse_id)
    if search:
        query = query.where(
            Inventory.reference.ilike(f"%{search}%")
            | Inventory.name.ilike(f"%{search}%")
        )
    return await paginate(db, query, page, page_size)


async def start_inventory(
    db: AsyncSession, inventory_id: int, current_user: User
) -> Inventory:
    inventory = await get_inventory(db, inventory_id)
    if inventory.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only start a draft inventory",
        )
    inventory.status = "in_progress"
    inventory.started_at = datetime.now()
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="start",
        module="stock",
        entity_type="inventory",
        entity_id=inventory.id,
        description=f"Started inventory '{inventory.name}'",
    )
    return await get_inventory(db, inventory_id)


async def update_inventory_line(
    db: AsyncSession,
    inventory_id: int,
    line_id: int,
    data: InventoryLineUpdate,
    current_user: User,
) -> Inventory:
    inventory = await get_inventory(db, inventory_id)
    if inventory.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update lines of an in-progress inventory",
        )
    result = await db.execute(
        select(InventoryLine).where(
            InventoryLine.id == line_id,
            InventoryLine.inventory_id == inventory_id,
        )
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inventory line not found"
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(line, field, value)
    await db.flush()
    return await get_inventory(db, inventory_id)


async def validate_inventory(
    db: AsyncSession, inventory_id: int, current_user: User
) -> Inventory:
    inventory = await get_inventory(db, inventory_id)
    if inventory.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only validate an in-progress inventory",
        )

    # Generate adjustment movements for each line with a difference
    for line in inventory.lines:
        if line.counted_quantity is None:
            continue
        diff = line.counted_quantity - line.expected_quantity
        if diff == 0:
            continue

        ref = await _generate_mov_reference(db)
        movement = StockMovement(
            reference=ref,
            movement_type="adjustment",
            product_id=line.product_id,
            lot_id=line.lot_id,
            destination_location_id=line.location_id,
            quantity=line.counted_quantity,
            status="validated",
            reason=f"Inventory adjustment from {inventory.reference}",
            notes=f"Expected: {line.expected_quantity}, Counted: {line.counted_quantity}, Diff: {diff}",
            validated_by_id=current_user.id,
            validated_at=datetime.now(),
            company_id=inventory.company_id,
        )
        db.add(movement)

        # Update stock level directly
        sl_result = await db.execute(
            select(StockLevel).where(
                StockLevel.product_id == line.product_id,
                StockLevel.location_id == line.location_id,
                StockLevel.lot_id == line.lot_id if line.lot_id else StockLevel.lot_id.is_(None),
            )
        )
        sl = sl_result.scalar_one_or_none()
        if sl:
            sl.quantity = line.counted_quantity
        else:
            sl = StockLevel(
                product_id=line.product_id,
                location_id=line.location_id,
                lot_id=line.lot_id,
                quantity=line.counted_quantity,
                reserved_quantity=Decimal(0),
                company_id=inventory.company_id,
            )
            db.add(sl)

    inventory.status = "validated"
    inventory.completed_at = datetime.now()
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="validate",
        module="stock",
        entity_type="inventory",
        entity_id=inventory.id,
        description=f"Validated inventory '{inventory.name}' ({inventory.reference})",
    )
    return await get_inventory(db, inventory_id)


async def cancel_inventory(
    db: AsyncSession, inventory_id: int, current_user: User
) -> Inventory:
    inventory = await get_inventory(db, inventory_id)
    if inventory.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inventory is already cancelled",
        )
    if inventory.status == "validated":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a validated inventory",
        )
    inventory.status = "cancelled"
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="cancel",
        module="stock",
        entity_type="inventory",
        entity_id=inventory.id,
        description=f"Cancelled inventory '{inventory.name}'",
    )
    return await get_inventory(db, inventory_id)
