import calendar
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import (
    Inventory,
    InventoryLine,
    InventoryCycle,
    Product,
    StockLevel,
    StockLocation,
)
from app.models.user import User
from app.schemas.stock import InventoryCycleCreate, InventoryCycleGenerateBody
from app.services.audit import log_action
from app.services.inventory import _generate_reference as _generate_inv_reference
from app.utils.pagination import paginate


def _add_months(d: date, months: int) -> date:
    """Add months to a date, clamping to last day of resulting month."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


async def create_cycle(
    db: AsyncSession, data: InventoryCycleCreate, current_user: User
) -> InventoryCycle:
    cycle = InventoryCycle(
        name=data.name,
        frequency=data.frequency,
        classification=data.classification,
        category_id=data.category_id,
        warehouse_id=data.warehouse_id,
        start_date=data.start_date,
        end_date=data.end_date,
        assigned_to_id=data.assigned_to_id,
        status="planned",
        company_id=data.company_id,
    )
    db.add(cycle)
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="inventory_cycle",
        entity_id=cycle.id,
        description=f"Created inventory cycle '{cycle.name}' ({cycle.frequency})",
    )
    return await get_cycle(db, cycle.id)


async def get_cycle(db: AsyncSession, cycle_id: int) -> InventoryCycle:
    result = await db.execute(
        select(InventoryCycle)
        .options(
            selectinload(InventoryCycle.warehouse),
            selectinload(InventoryCycle.category),
            selectinload(InventoryCycle.assigned_to),
            selectinload(InventoryCycle.inventory),
        )
        .where(InventoryCycle.id == cycle_id)
    )
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inventory cycle not found"
        )
    return cycle


async def list_cycles(
    db: AsyncSession,
    company_id: int,
    *,
    status_filter: str | None = None,
    warehouse_id: int | None = None,
    frequency: str | None = None,
    classification: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(InventoryCycle)
        .options(
            selectinload(InventoryCycle.warehouse),
            selectinload(InventoryCycle.category),
            selectinload(InventoryCycle.assigned_to),
        )
        .where(InventoryCycle.company_id == company_id)
        .order_by(InventoryCycle.start_date.desc())
    )
    if status_filter:
        query = query.where(InventoryCycle.status == status_filter)
    if warehouse_id:
        query = query.where(InventoryCycle.warehouse_id == warehouse_id)
    if frequency:
        query = query.where(InventoryCycle.frequency == frequency)
    if classification:
        query = query.where(InventoryCycle.classification == classification)
    return await paginate(db, query, page, page_size)


async def generate_cycles(
    db: AsyncSession, body: InventoryCycleGenerateBody, current_user: User
) -> list[InventoryCycle]:
    """Auto-generate cycles based on ABC classification rules.
    A = monthly, B = quarterly, C = yearly.
    """
    created_ids: list[int] = []
    classifications = [
        ("A", "monthly", 1),
        ("B", "quarterly", 3),
        ("C", "yearly", 12),
    ]

    for cls, freq, months_interval in classifications:
        current_start = body.period_start
        while current_start < body.period_end:
            period_end = _add_months(current_start, months_interval)
            if period_end > body.period_end:
                period_end = body.period_end

            cycle = InventoryCycle(
                name=f"Cycle {cls} - {current_start.strftime('%Y-%m')}",
                frequency=freq,
                classification=cls,
                warehouse_id=body.warehouse_id,
                start_date=current_start,
                end_date=period_end,
                assigned_to_id=body.assigned_to_id,
                status="planned",
                company_id=body.company_id,
            )
            db.add(cycle)
            await db.flush()
            created_ids.append(cycle.id)
            current_start = period_end

    await log_action(
        db,
        user=current_user,
        action="generate",
        module="stock",
        entity_type="inventory_cycle",
        entity_id=0,
        description=f"Generated {len(created_ids)} inventory cycles for period {body.period_start} to {body.period_end}",
    )

    cycles = []
    for cid in created_ids:
        cycles.append(await get_cycle(db, cid))
    return cycles


async def start_cycle(
    db: AsyncSession, cycle_id: int, current_user: User
) -> InventoryCycle:
    """Planned → in_progress: create a filtered Inventory session."""
    cycle = await get_cycle(db, cycle_id)
    if cycle.status != "planned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only start a planned cycle",
        )

    # Create inventory session
    inv_ref = await _generate_inv_reference(db)
    inventory = Inventory(
        reference=inv_ref,
        name=f"Inventaire {cycle.name}",
        warehouse_id=cycle.warehouse_id,
        status="in_progress",
        notes=f"Auto-generated from cycle '{cycle.name}'",
        created_by_id=current_user.id,
        company_id=cycle.company_id,
    )
    db.add(inventory)
    await db.flush()

    # Get active locations for warehouse
    loc_result = await db.execute(
        select(StockLocation.id).where(
            StockLocation.warehouse_id == cycle.warehouse_id,
            StockLocation.is_active.is_(True),
        )
    )
    location_ids = [row[0] for row in loc_result.all()]

    if location_ids:
        # Build product filter based on classification and category
        product_query = select(Product.id).where(
            Product.company_id == cycle.company_id,
            Product.is_active.is_(True),
            Product.product_type == "stockable",
        )
        if cycle.classification:
            product_query = product_query.where(
                Product.abc_classification == cycle.classification
            )
        if cycle.category_id:
            product_query = product_query.where(
                Product.category_id == cycle.category_id
            )
        prod_result = await db.execute(product_query)
        product_ids = [row[0] for row in prod_result.all()]

        if product_ids:
            levels_result = await db.execute(
                select(StockLevel).where(
                    StockLevel.location_id.in_(location_ids),
                    StockLevel.product_id.in_(product_ids),
                    StockLevel.company_id == cycle.company_id,
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

    cycle.status = "in_progress"
    cycle.inventory_id = inventory.id
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="start",
        module="stock",
        entity_type="inventory_cycle",
        entity_id=cycle.id,
        description=f"Started cycle '{cycle.name}', created inventory {inv_ref}",
    )
    return await get_cycle(db, cycle_id)


async def complete_cycle(
    db: AsyncSession, cycle_id: int, current_user: User
) -> InventoryCycle:
    """In_progress → completed: verify linked inventory is validated."""
    cycle = await get_cycle(db, cycle_id)
    if cycle.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only complete an in-progress cycle",
        )
    if cycle.inventory_id:
        inv_result = await db.execute(
            select(Inventory).where(Inventory.id == cycle.inventory_id)
        )
        inventory = inv_result.scalar_one_or_none()
        if inventory and inventory.status != "validated":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Linked inventory must be validated before completing the cycle",
            )

    cycle.status = "completed"
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="complete",
        module="stock",
        entity_type="inventory_cycle",
        entity_id=cycle.id,
        description=f"Completed cycle '{cycle.name}'",
    )
    return await get_cycle(db, cycle_id)
