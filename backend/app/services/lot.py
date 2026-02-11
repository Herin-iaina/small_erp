from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Lot
from app.models.user import User
from app.schemas.stock import LotCreate, LotUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def create_lot(
    db: AsyncSession, data: LotCreate, current_user: User
) -> Lot:
    existing = await db.execute(
        select(Lot).where(
            Lot.lot_number == data.lot_number,
            Lot.product_id == data.product_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lot number '{data.lot_number}' already exists for this product",
        )
    lot = Lot(**data.model_dump())
    db.add(lot)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="lot",
        entity_id=lot.id,
        description=f"Created lot '{lot.lot_number}'",
        new_values=data.model_dump(mode="json"),
    )
    return await get_lot(db, lot.id)


async def get_lot(db: AsyncSession, lot_id: int) -> Lot:
    result = await db.execute(
        select(Lot)
        .options(selectinload(Lot.product), selectinload(Lot.supplier))
        .where(Lot.id == lot_id)
    )
    lot = result.scalar_one_or_none()
    if not lot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Lot not found"
        )
    return lot


async def list_lots(
    db: AsyncSession,
    company_id: int,
    *,
    product_id: int | None = None,
    is_expired: bool | None = None,
    expiring_within_days: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(Lot)
        .options(selectinload(Lot.product), selectinload(Lot.supplier))
        .where(Lot.company_id == company_id)
        .order_by(Lot.created_at.desc())
    )
    if product_id is not None:
        query = query.where(Lot.product_id == product_id)
    if is_expired is True:
        query = query.where(Lot.expiry_date < date.today())
    elif is_expired is False:
        query = query.where(
            (Lot.expiry_date >= date.today()) | (Lot.expiry_date.is_(None))
        )
    if expiring_within_days is not None:
        cutoff = date.today() + timedelta(days=expiring_within_days)
        query = query.where(
            Lot.expiry_date.isnot(None),
            Lot.expiry_date <= cutoff,
            Lot.expiry_date >= date.today(),
        )
    if search:
        query = query.where(Lot.lot_number.ilike(f"%{search}%"))
    return await paginate(db, query, page, page_size)


async def update_lot(
    db: AsyncSession, lot_id: int, data: LotUpdate, current_user: User
) -> Lot:
    lot = await get_lot(db, lot_id)
    old_values = {
        k: getattr(lot, k) for k in data.model_dump(exclude_unset=True)
    }
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lot, field, value)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="update",
        module="stock",
        entity_type="lot",
        entity_id=lot.id,
        description=f"Updated lot '{lot.lot_number}'",
        old_values={k: str(v) for k, v in old_values.items()},
        new_values={k: str(v) for k, v in update_data.items()},
    )
    return await get_lot(db, lot_id)
