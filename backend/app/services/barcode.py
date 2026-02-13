from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Product, ProductBarcode
from app.models.user import User
from app.schemas.stock import ProductBarcodeCreate
from app.services.audit import log_action


async def add_barcode(
    db: AsyncSession,
    product_id: int,
    data: ProductBarcodeCreate,
    current_user: User,
) -> ProductBarcode:
    # Check product exists
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Check barcode uniqueness
    existing = await db.execute(
        select(ProductBarcode).where(ProductBarcode.barcode == data.barcode)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Barcode '{data.barcode}' already exists",
        )

    # If setting as primary, un-primary existing ones
    if data.is_primary:
        result = await db.execute(
            select(ProductBarcode).where(
                ProductBarcode.product_id == product_id,
                ProductBarcode.is_primary.is_(True),
            )
        )
        for bc in result.scalars().all():
            bc.is_primary = False

    barcode = ProductBarcode(
        product_id=product_id,
        barcode=data.barcode,
        barcode_type=data.barcode_type,
        is_primary=data.is_primary,
        company_id=product.company_id,
    )
    db.add(barcode)
    await db.flush()

    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="product_barcode",
        entity_id=barcode.id,
        description=f"Added barcode '{data.barcode}' to product '{product.name}'",
        new_values={"barcode": data.barcode, "barcode_type": data.barcode_type},
    )

    return barcode


async def list_barcodes(
    db: AsyncSession, product_id: int
) -> list[ProductBarcode]:
    result = await db.execute(
        select(ProductBarcode)
        .where(ProductBarcode.product_id == product_id)
        .order_by(ProductBarcode.is_primary.desc(), ProductBarcode.created_at)
    )
    return list(result.scalars().all())


async def delete_barcode(
    db: AsyncSession, barcode_id: int, current_user: User
) -> None:
    barcode = await db.get(ProductBarcode, barcode_id)
    if not barcode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barcode not found",
        )

    await log_action(
        db,
        user=current_user,
        action="delete",
        module="stock",
        entity_type="product_barcode",
        entity_id=barcode.id,
        description=f"Deleted barcode '{barcode.barcode}'",
    )
    await db.delete(barcode)


async def lookup_by_barcode(
    db: AsyncSession, barcode: str
) -> Product:
    """Find product by barcode (checks product_barcodes table and legacy barcode field)."""
    # First check product_barcodes table
    result = await db.execute(
        select(ProductBarcode).where(ProductBarcode.barcode == barcode)
    )
    pb = result.scalar_one_or_none()
    if pb:
        product_result = await db.execute(
            select(Product)
            .options(selectinload(Product.category))
            .where(Product.id == pb.product_id)
        )
        product = product_result.scalar_one_or_none()
        if product:
            return product

    # Fallback to legacy barcode field on Product
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.barcode == barcode)
    )
    product = result.scalar_one_or_none()
    if product:
        return product

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No product found for barcode '{barcode}'",
    )
