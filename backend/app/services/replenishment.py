from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Product, ProductCategory, StockLevel, StockMovement


async def get_replenishment_suggestions(
    db: AsyncSession,
    company_id: int,
    *,
    category_id: int | None = None,
    abc_classification: str | None = None,
) -> list[dict]:
    """Return products where available stock <= reorder_point."""
    # Get all active stockable products with their stock totals
    query = (
        select(
            Product.id,
            Product.name,
            Product.sku,
            Product.reorder_point,
            Product.reorder_quantity,
            Product.optimal_order_quantity,
            Product.cost_price,
            Product.lead_time_days,
            Product.abc_classification,
            Product.category_id,
            ProductCategory.name.label("category_name"),
            func.coalesce(func.sum(StockLevel.quantity), 0).label("total_qty"),
            func.coalesce(func.sum(StockLevel.reserved_quantity), 0).label("total_reserved"),
        )
        .outerjoin(StockLevel, StockLevel.product_id == Product.id)
        .outerjoin(ProductCategory, Product.category_id == ProductCategory.id)
        .where(
            Product.company_id == company_id,
            Product.is_active.is_(True),
            Product.product_type == "stockable",
            Product.reorder_point > 0,
        )
        .group_by(Product.id, ProductCategory.name)
    )

    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if abc_classification:
        query = query.where(Product.abc_classification == abc_classification)

    result = await db.execute(query)
    rows = result.all()

    suggestions = []
    for row in rows:
        total_qty = Decimal(str(row.total_qty))
        total_reserved = Decimal(str(row.total_reserved))
        available = total_qty - total_reserved

        if available > row.reorder_point:
            continue

        # Determine suggested quantity
        if row.optimal_order_quantity and row.optimal_order_quantity > 0:
            suggested = row.optimal_order_quantity
        elif row.reorder_quantity and row.reorder_quantity > 0:
            suggested = row.reorder_quantity
        else:
            suggested = row.reorder_point * 2

        estimated_cost = suggested * (row.cost_price or Decimal(0))

        suggestions.append({
            "product_id": row.id,
            "product_name": row.name,
            "sku": row.sku,
            "category_name": row.category_name,
            "current_stock": total_qty,
            "reserved_stock": total_reserved,
            "available_stock": available,
            "reorder_point": row.reorder_point,
            "suggested_quantity": suggested,
            "lead_time_days": row.lead_time_days,
            "estimated_cost": estimated_cost,
            "abc_classification": row.abc_classification,
        })

    return suggestions


async def get_consumption_stats(
    db: AsyncSession, product_id: int
) -> dict:
    """Compute consumption stats for 7, 30, 90 days from validated out movements."""
    now = datetime.now()
    periods = [
        ("7d", now - timedelta(days=7), 7),
        ("30d", now - timedelta(days=30), 30),
        ("90d", now - timedelta(days=90), 90),
    ]

    stats: dict = {"product_id": product_id}
    for label, start_date, days in periods:
        result = await db.execute(
            select(func.coalesce(func.sum(StockMovement.quantity), 0)).where(
                StockMovement.product_id == product_id,
                StockMovement.movement_type == "out",
                StockMovement.status == "validated",
                StockMovement.validated_at >= start_date,
            )
        )
        total_out = Decimal(str(result.scalar() or 0))
        avg = total_out / days if days > 0 else Decimal(0)
        stats[f"total_out_{label}"] = total_out
        stats[f"avg_{label}"] = round(avg, 3)

    return stats


async def calculate_reorder_points(
    db: AsyncSession, company_id: int
) -> int:
    """Recalculate reorder points for all products:
    reorder_point = (avg_daily_consumption × lead_time_days) + min_stock_level
    """
    now = datetime.now()
    start_30d = now - timedelta(days=30)

    # Get all active stockable products
    result = await db.execute(
        select(Product).where(
            Product.company_id == company_id,
            Product.is_active.is_(True),
            Product.product_type == "stockable",
        )
    )
    products = list(result.scalars().all())

    count = 0
    for product in products:
        # Calculate avg daily consumption from last 30 days
        out_result = await db.execute(
            select(func.coalesce(func.sum(StockMovement.quantity), 0)).where(
                StockMovement.product_id == product.id,
                StockMovement.movement_type == "out",
                StockMovement.status == "validated",
                StockMovement.validated_at >= start_30d,
            )
        )
        total_out = Decimal(str(out_result.scalar() or 0))
        avg_daily = total_out / 30

        product.average_daily_consumption = round(avg_daily, 3)

        if product.lead_time_days > 0:
            new_reorder = (avg_daily * product.lead_time_days) + (product.min_stock_level or Decimal(0))
            product.reorder_point = round(new_reorder, 3)

        count += 1

    await db.flush()
    return count


async def calculate_abc_classification(
    db: AsyncSession, company_id: int
) -> dict[str, int]:
    """Classify products by ABC based on stock value (quantity × cost_price)."""
    result = await db.execute(
        select(
            Product.id,
            Product.cost_price,
            func.coalesce(func.sum(StockLevel.quantity), 0).label("total_qty"),
        )
        .outerjoin(StockLevel, StockLevel.product_id == Product.id)
        .where(
            Product.company_id == company_id,
            Product.is_active.is_(True),
            Product.product_type == "stockable",
        )
        .group_by(Product.id)
    )
    rows = result.all()

    # Calculate stock value for each product
    product_values = []
    for row in rows:
        value = Decimal(str(row.total_qty)) * (row.cost_price or Decimal(0))
        product_values.append((row.id, value))

    # Sort by value descending
    product_values.sort(key=lambda x: x[1], reverse=True)

    total_value = sum(v for _, v in product_values)
    counts = {"A": 0, "B": 0, "C": 0}

    if total_value > 0:
        cumulative = Decimal(0)
        for pid, value in product_values:
            cumulative += value
            pct = cumulative / total_value
            if pct <= Decimal("0.80"):
                classification = "A"
            elif pct <= Decimal("0.95"):
                classification = "B"
            else:
                classification = "C"

            product = await db.get(Product, pid)
            if product:
                product.abc_classification = classification
                counts[classification] += 1

        await db.flush()

    return counts
