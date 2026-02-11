from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Product, ProductCategory
from app.schemas.stock import ProductCategoryCreate, ProductCategoryUpdate
from app.services.audit import log_action
from app.models.user import User
from app.utils.pagination import paginate


async def create_category(
    db: AsyncSession, data: ProductCategoryCreate, current_user: User
) -> ProductCategory:
    existing = await db.execute(
        select(ProductCategory).where(
            ProductCategory.code == data.code,
            ProductCategory.company_id == data.company_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category code '{data.code}' already exists for this company",
        )
    category = ProductCategory(**data.model_dump())
    db.add(category)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="create",
        module="stock",
        entity_type="product_category",
        entity_id=category.id,
        description=f"Created category '{category.name}'",
        new_values=data.model_dump(),
    )
    return await get_category(db, category.id)


async def get_category(db: AsyncSession, category_id: int) -> ProductCategory:
    result = await db.execute(
        select(ProductCategory)
        .options(selectinload(ProductCategory.children))
        .where(ProductCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return category


async def list_categories(
    db: AsyncSession,
    company_id: int,
    *,
    search: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(ProductCategory)
        .where(ProductCategory.company_id == company_id)
        .order_by(ProductCategory.name)
    )
    if is_active is not None:
        query = query.where(ProductCategory.is_active.is_(is_active))
    if search:
        query = query.where(
            ProductCategory.name.ilike(f"%{search}%")
            | ProductCategory.code.ilike(f"%{search}%")
        )
    return await paginate(db, query, page, page_size)


async def update_category(
    db: AsyncSession,
    category_id: int,
    data: ProductCategoryUpdate,
    current_user: User,
) -> ProductCategory:
    category = await get_category(db, category_id)
    old_values = {
        k: getattr(category, k) for k in data.model_dump(exclude_unset=True)
    }
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    await db.flush()
    await log_action(
        db,
        user=current_user,
        action="update",
        module="stock",
        entity_type="product_category",
        entity_id=category.id,
        description=f"Updated category '{category.name}'",
        old_values=old_values,
        new_values=update_data,
    )
    return await get_category(db, category_id)


async def delete_category(
    db: AsyncSession, category_id: int, current_user: User
) -> None:
    category = await get_category(db, category_id)
    # Check if products are linked
    result = await db.execute(
        select(Product.id).where(Product.category_id == category_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete category with linked products",
        )
    await log_action(
        db,
        user=current_user,
        action="delete",
        module="stock",
        entity_type="product_category",
        entity_id=category.id,
        description=f"Deleted category '{category.name}'",
    )
    await db.delete(category)
