from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stock import Lot, Product, StockLevel


async def get_stock_kpis(db: AsyncSession, company_id: int) -> dict:
    # Total active products
    total_result = await db.execute(
        select(func.count(Product.id)).where(
            Product.company_id == company_id, Product.is_active.is_(True)
        )
    )
    total_products = total_result.scalar() or 0

    # Total stock value (sum of qty * cost_price per product)
    value_result = await db.execute(
        select(func.coalesce(func.sum(StockLevel.quantity * Product.cost_price), 0))
        .join(Product, StockLevel.product_id == Product.id)
        .where(StockLevel.company_id == company_id)
    )
    total_stock_value = value_result.scalar() or Decimal(0)

    # Products with stock below reorder_point (low stock)
    low_stock_subq = (
        select(
            StockLevel.product_id,
            func.sum(StockLevel.quantity).label("total_qty"),
        )
        .where(StockLevel.company_id == company_id)
        .group_by(StockLevel.product_id)
        .subquery()
    )
    low_stock_result = await db.execute(
        select(func.count(Product.id))
        .join(low_stock_subq, Product.id == low_stock_subq.c.product_id)
        .where(
            Product.company_id == company_id,
            Product.is_active.is_(True),
            Product.reorder_point > 0,
            low_stock_subq.c.total_qty <= Product.reorder_point,
            low_stock_subq.c.total_qty > 0,
        )
    )
    low_stock_count = low_stock_result.scalar() or 0

    # Products with zero stock (stockable only)
    all_stockable = (
        select(Product.id)
        .where(
            Product.company_id == company_id,
            Product.is_active.is_(True),
            Product.product_type == "stockable",
        )
        .subquery()
    )
    has_stock = (
        select(StockLevel.product_id)
        .where(StockLevel.company_id == company_id, StockLevel.quantity > 0)
        .group_by(StockLevel.product_id)
        .subquery()
    )
    out_of_stock_result = await db.execute(
        select(func.count())
        .select_from(all_stockable)
        .where(all_stockable.c.id.notin_(select(has_stock.c.product_id)))
    )
    out_of_stock_count = out_of_stock_result.scalar() or 0

    # Lots expiring within 30 days
    cutoff = date.today() + timedelta(days=30)
    expiring_result = await db.execute(
        select(func.count(Lot.id)).where(
            Lot.company_id == company_id,
            Lot.is_active.is_(True),
            Lot.expiry_date.isnot(None),
            Lot.expiry_date <= cutoff,
            Lot.expiry_date >= date.today(),
        )
    )
    expiring_soon_count = expiring_result.scalar() or 0

    return {
        "total_products": total_products,
        "total_stock_value": total_stock_value,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "expiring_soon_count": expiring_soon_count,
    }


async def get_stock_alerts(db: AsyncSession, company_id: int) -> list[dict]:
    stock_subq = (
        select(
            StockLevel.product_id,
            func.sum(StockLevel.quantity).label("current_stock"),
        )
        .where(StockLevel.company_id == company_id)
        .group_by(StockLevel.product_id)
        .subquery()
    )
    result = await db.execute(
        select(
            Product.id,
            Product.name,
            Product.sku,
            func.coalesce(stock_subq.c.current_stock, 0).label("current_stock"),
            Product.min_stock_level,
            Product.reorder_point,
        )
        .outerjoin(stock_subq, Product.id == stock_subq.c.product_id)
        .where(
            Product.company_id == company_id,
            Product.is_active.is_(True),
            Product.reorder_point > 0,
            func.coalesce(stock_subq.c.current_stock, 0) <= Product.reorder_point,
        )
        .order_by(func.coalesce(stock_subq.c.current_stock, 0).asc())
    )
    return [
        {
            "product_id": row.id,
            "product_name": row.name,
            "sku": row.sku,
            "current_stock": row.current_stock,
            "min_stock_level": row.min_stock_level,
            "reorder_point": row.reorder_point,
        }
        for row in result.all()
    ]


async def get_stock_valuation(db: AsyncSession, company_id: int) -> list[dict]:
    stock_subq = (
        select(
            StockLevel.product_id,
            func.sum(StockLevel.quantity).label("quantity"),
        )
        .where(StockLevel.company_id == company_id)
        .group_by(StockLevel.product_id)
        .having(func.sum(StockLevel.quantity) > 0)
        .subquery()
    )
    result = await db.execute(
        select(
            Product.id,
            Product.name,
            Product.sku,
            stock_subq.c.quantity,
            Product.cost_price,
            (stock_subq.c.quantity * Product.cost_price).label("total_value"),
        )
        .join(stock_subq, Product.id == stock_subq.c.product_id)
        .where(Product.company_id == company_id, Product.is_active.is_(True))
        .order_by((stock_subq.c.quantity * Product.cost_price).desc())
    )
    return [
        {
            "product_id": row.id,
            "product_name": row.name,
            "sku": row.sku,
            "quantity": row.quantity,
            "unit_cost": row.cost_price,
            "total_value": row.total_value,
        }
        for row in result.all()
    ]


async def get_product_stock_totals(
    db: AsyncSession, company_id: int
) -> dict[int, Decimal]:
    """Return {product_id: total_quantity} for all products with stock."""
    result = await db.execute(
        select(
            StockLevel.product_id,
            func.coalesce(func.sum(StockLevel.quantity), 0).label("total"),
        )
        .where(StockLevel.company_id == company_id)
        .group_by(StockLevel.product_id)
    )
    return {row.product_id: row.total for row in result.all()}
