from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Product, StockLevel, StockLocation
from app.models.user import User
from app.schemas.stock import ProductCreate, ProductUpdate
from app.services.audit import log_action
from app.utils.pagination import paginate


async def create_product(
    db: AsyncSession, data: ProductCreate, current_user: User
) -> Product:
    existing = await db.execute(
        select(Product).where(
            Product.sku == data.sku,
            Product.company_id == data.company_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product SKU '{data.sku}' already exists for this company",
        )
    create_data = data.model_dump()
    if not create_data.get("category_id"):
        create_data["category_id"] = None
    product = Product(**create_data)
    db.add(product)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="product",
        entity_id=product.id,
        description=f"Created product '{product.name}' (SKU: {product.sku})",
        new_values=data.model_dump(mode="json"),
    )
    return await get_product(db, product.id)


async def get_product(db: AsyncSession, product_id: int) -> Product:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.unit),
            selectinload(Product.purchase_unit),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return product


async def list_products(
    db: AsyncSession,
    company_id: int,
    *,
    category_id: int | None = None,
    product_type: str | None = None,
    is_active: bool | None = None,
    tracking_type: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.unit),
            selectinload(Product.purchase_unit),
        )
        .where(Product.company_id == company_id)
        .order_by(Product.name)
    )
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if product_type is not None:
        query = query.where(Product.product_type == product_type)
    if is_active is not None:
        query = query.where(Product.is_active.is_(is_active))
    if tracking_type is not None:
        query = query.where(Product.tracking_type == tracking_type)
    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%")
            | Product.sku.ilike(f"%{search}%")
            | Product.barcode.ilike(f"%{search}%")
        )
    return await paginate(db, query, page, page_size)


async def update_product(
    db: AsyncSession,
    product_id: int,
    data: ProductUpdate,
    current_user: User,
) -> Product:
    product = await get_product(db, product_id)
    old_values = {
        k: getattr(product, k) for k in data.model_dump(exclude_unset=True)
    }
    update_data = data.model_dump(exclude_unset=True)
    if "category_id" in update_data and not update_data["category_id"]:
        update_data["category_id"] = None
    for field, value in update_data.items():
        setattr(product, field, value)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="update",
        module="stock",
        entity_type="product",
        entity_id=product.id,
        description=f"Updated product '{product.name}'",
        old_values={k: str(v) for k, v in old_values.items()},
        new_values={k: str(v) for k, v in update_data.items()},
    )
    return await get_product(db, product_id)


async def toggle_product_status(
    db: AsyncSession, product_id: int, current_user: User
) -> Product:
    product = await get_product(db, product_id)
    old_status = product.is_active
    product.is_active = not product.is_active
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="toggle_status",
        module="stock",
        entity_type="product",
        entity_id=product.id,
        description=f"{'Activated' if product.is_active else 'Deactivated'} product '{product.name}'",
        old_values={"is_active": old_status},
        new_values={"is_active": product.is_active},
    )
    return await get_product(db, product_id)


async def get_product_stock_summary(
    db: AsyncSession, product_id: int
) -> dict:
    product = await get_product(db, product_id)

    result = await db.execute(
        select(
            StockLevel.location_id,
            StockLocation.name.label("location_name"),
            StockLevel.lot_id,
            StockLevel.quantity,
            StockLevel.reserved_quantity,
        )
        .join(StockLocation, StockLevel.location_id == StockLocation.id)
        .where(StockLevel.product_id == product_id)
    )
    rows = result.all()

    total_qty = Decimal(0)
    total_reserved = Decimal(0)
    by_location = []

    for row in rows:
        qty = row.quantity or Decimal(0)
        reserved = row.reserved_quantity or Decimal(0)
        total_qty += qty
        total_reserved += reserved
        by_location.append({
            "location_id": row.location_id,
            "location_name": row.location_name,
            "lot_id": row.lot_id,
            "lot_number": None,
            "quantity": qty,
            "reserved_quantity": reserved,
            "available_quantity": qty - reserved,
        })

    total_value = total_qty * (product.cost_price or Decimal(0))

    return {
        "product_id": product_id,
        "total_quantity": total_qty,
        "total_reserved": total_reserved,
        "total_available": total_qty - total_reserved,
        "total_value": total_value,
        "by_location": by_location,
    }


async def get_product_availability(
    db: AsyncSession, product_id: int
) -> dict:
    """Return physical, reserved, and available stock for a product."""
    product = await get_product(db, product_id)
    stock_summary = await get_product_stock_summary(db, product_id)
    return {
        "product_id": product_id,
        "product_name": product.name,
        "sku": product.sku,
        "physical_stock": stock_summary["total_quantity"],
        "reserved_stock": stock_summary["total_reserved"],
        "available_stock": stock_summary["total_available"],
        "by_location": stock_summary["by_location"],
    }
