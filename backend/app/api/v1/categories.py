from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import (
    ProductCategoryCreate,
    ProductCategoryRead,
    ProductCategoryUpdate,
)
from app.services.category import (
    create_category,
    delete_category,
    list_categories,
    update_category,
)

router = APIRouter(prefix="/categories", tags=["Product Categories"])


@router.get("", response_model=dict)
async def list_categories_endpoint(
    company_id: int = Query(...),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_categories(
        db, company_id, search=search, is_active=is_active, page=page, page_size=page_size,
    )
    result["items"] = [ProductCategoryRead.model_validate(c) for c in result["items"]]
    return result


@router.post("", response_model=ProductCategoryRead, status_code=201)
async def create_category_endpoint(
    body: ProductCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    cat = await create_category(db, body, current_user)
    return ProductCategoryRead.model_validate(cat)


@router.patch("/{category_id}", response_model=ProductCategoryRead)
async def update_category_endpoint(
    category_id: int,
    body: ProductCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    cat = await update_category(db, category_id, body, current_user)
    return ProductCategoryRead.model_validate(cat)


@router.delete("/{category_id}", status_code=204)
async def delete_category_endpoint(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.delete")),
):
    await delete_category(db, category_id, current_user)
