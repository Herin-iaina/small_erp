from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import UnitOfMeasure
from app.models.user import User
from app.schemas.stock import UnitOfMeasureCreate, UnitOfMeasureUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def create_uom(
    db: AsyncSession, data: UnitOfMeasureCreate, current_user: User
) -> UnitOfMeasure:
    uom = UnitOfMeasure(
        name=data.name,
        symbol=data.symbol,
        category=data.category,
        base_unit_id=data.base_unit_id,
        conversion_factor=data.conversion_factor,
        company_id=data.company_id,
    )
    db.add(uom)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="unit_of_measure",
        entity_id=uom.id,
        description=f"Created unit '{uom.name}' ({uom.symbol})",
    )
    return await get_uom(db, uom.id)


async def update_uom(
    db: AsyncSession, uom_id: int, data: UnitOfMeasureUpdate, current_user: User
) -> UnitOfMeasure:
    uom = await get_uom(db, uom_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(uom, field, value)
    await db.flush()
    return await get_uom(db, uom_id)


async def get_uom(db: AsyncSession, uom_id: int) -> UnitOfMeasure:
    result = await db.execute(
        select(UnitOfMeasure)
        .options(selectinload(UnitOfMeasure.base_unit))
        .where(UnitOfMeasure.id == uom_id)
    )
    uom = result.scalar_one_or_none()
    if not uom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unit of measure not found"
        )
    return uom


async def list_uoms(
    db: AsyncSession,
    company_id: int,
    *,
    category: str | None = None,
    search: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    query = (
        select(UnitOfMeasure)
        .options(selectinload(UnitOfMeasure.base_unit))
        .where(UnitOfMeasure.company_id == company_id)
        .order_by(UnitOfMeasure.category, UnitOfMeasure.name)
    )
    if category:
        query = query.where(UnitOfMeasure.category == category)
    if search:
        query = query.where(
            UnitOfMeasure.name.ilike(f"%{search}%")
            | UnitOfMeasure.symbol.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.where(UnitOfMeasure.is_active == is_active)
    return await paginate(db, query, page, page_size)


async def get_conversions(db: AsyncSession, uom_id: int) -> list[dict]:
    """Return all units in the same category with relative conversion factors."""
    uom = await get_uom(db, uom_id)
    result = await db.execute(
        select(UnitOfMeasure)
        .where(
            UnitOfMeasure.company_id == uom.company_id,
            UnitOfMeasure.category == uom.category,
            UnitOfMeasure.is_active.is_(True),
        )
        .order_by(UnitOfMeasure.conversion_factor)
    )
    units = result.scalars().all()

    source_factor = uom.conversion_factor
    conversions = []
    for u in units:
        if u.id == uom.id:
            continue
        # Conversion: qty_source * (source_factor / target_factor) = qty_target
        factor = source_factor / u.conversion_factor if u.conversion_factor else Decimal(0)
        conversions.append({
            "unit_id": u.id,
            "symbol": u.symbol,
            "name": u.name,
            "conversion_factor": float(round(factor, 6)),
        })
    return conversions


async def convert(
    db: AsyncSession, from_unit_id: int, to_unit_id: int, quantity: Decimal
) -> Decimal:
    """Convert quantity from one unit to another (same category)."""
    from_uom = await get_uom(db, from_unit_id)
    to_uom = await get_uom(db, to_unit_id)
    if from_uom.category != to_uom.category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot convert between different unit categories",
        )
    if to_uom.conversion_factor == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target unit has zero conversion factor",
        )
    return quantity * from_uom.conversion_factor / to_uom.conversion_factor


DEFAULT_UOMS = [
    # unit
    {"name": "Piece", "symbol": "pce", "category": "unit", "base_unit_symbol": None, "conversion_factor": 1},
    {"name": "Carton", "symbol": "ctn", "category": "unit", "base_unit_symbol": "pce", "conversion_factor": 24},
    # weight
    {"name": "Kilogramme", "symbol": "kg", "category": "weight", "base_unit_symbol": None, "conversion_factor": 1},
    {"name": "Gramme", "symbol": "g", "category": "weight", "base_unit_symbol": "kg", "conversion_factor": Decimal("0.001")},
    {"name": "Tonne", "symbol": "t", "category": "weight", "base_unit_symbol": "kg", "conversion_factor": 1000},
    # volume
    {"name": "Litre", "symbol": "l", "category": "volume", "base_unit_symbol": None, "conversion_factor": 1},
    {"name": "Millilitre", "symbol": "ml", "category": "volume", "base_unit_symbol": "l", "conversion_factor": Decimal("0.001")},
    # length
    {"name": "Metre", "symbol": "m", "category": "length", "base_unit_symbol": None, "conversion_factor": 1},
    {"name": "Centimetre", "symbol": "cm", "category": "length", "base_unit_symbol": "m", "conversion_factor": Decimal("0.01")},
    # surface
    {"name": "Metre carre", "symbol": "m2", "category": "surface", "base_unit_symbol": None, "conversion_factor": 1},
    # time
    {"name": "Heure", "symbol": "h", "category": "time", "base_unit_symbol": None, "conversion_factor": 1},
    {"name": "Jour", "symbol": "j", "category": "time", "base_unit_symbol": "h", "conversion_factor": 8},
]


async def seed_default_uoms(
    db: AsyncSession, company_id: int, current_user: User
) -> list[UnitOfMeasure]:
    """Insert default UOM set for a company. Skip already existing symbols."""
    created = []
    # First pass: create base units (no base_unit_symbol)
    symbol_to_id: dict[str, int] = {}

    for uom_data in DEFAULT_UOMS:
        if uom_data["base_unit_symbol"] is not None:
            continue
        # Check if exists
        result = await db.execute(
            select(UnitOfMeasure).where(
                UnitOfMeasure.symbol == uom_data["symbol"],
                UnitOfMeasure.company_id == company_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            symbol_to_id[existing.symbol] = existing.id
            continue
        uom = UnitOfMeasure(
            name=uom_data["name"],
            symbol=uom_data["symbol"],
            category=uom_data["category"],
            conversion_factor=uom_data["conversion_factor"],
            company_id=company_id,
        )
        db.add(uom)
        await db.flush()
        symbol_to_id[uom.symbol] = uom.id
        created.append(uom)

    # Second pass: create derived units
    for uom_data in DEFAULT_UOMS:
        if uom_data["base_unit_symbol"] is None:
            continue
        result = await db.execute(
            select(UnitOfMeasure).where(
                UnitOfMeasure.symbol == uom_data["symbol"],
                UnitOfMeasure.company_id == company_id,
            )
        )
        if result.scalar_one_or_none():
            continue
        base_id = symbol_to_id.get(uom_data["base_unit_symbol"])
        uom = UnitOfMeasure(
            name=uom_data["name"],
            symbol=uom_data["symbol"],
            category=uom_data["category"],
            base_unit_id=base_id,
            conversion_factor=uom_data["conversion_factor"],
            company_id=company_id,
        )
        db.add(uom)
        await db.flush()
        created.append(uom)

    if created:
        await log_action(
            db,
            user=current_user,
            action="seed",
            module="stock",
            entity_type="unit_of_measure",
            entity_id=0,
            description=f"Seeded {len(created)} default units of measure",
        )

    return created
