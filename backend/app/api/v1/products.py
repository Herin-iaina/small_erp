from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import (
    ProductCreate,
    ProductRead,
    ProductStockSummary,
    ProductUpdate,
)
from app.services.product import (
    create_product,
    get_product,
    get_product_stock_summary,
    list_products,
    toggle_product_status,
    update_product,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=dict)
async def list_products_endpoint(
    company_id: int = Query(...),
    category_id: int | None = Query(None),
    product_type: str | None = Query(None),
    is_active: bool | None = Query(None),
    tracking_type: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_products(
        db, company_id,
        category_id=category_id, product_type=product_type,
        is_active=is_active, tracking_type=tracking_type,
        search=search, page=page, page_size=page_size,
    )
    result["items"] = [ProductRead.model_validate(p) for p in result["items"]]
    return result


@router.post("", response_model=ProductRead, status_code=201)
async def create_product_endpoint(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    product = await create_product(db, body, current_user)
    return ProductRead.model_validate(product)


@router.get("/{product_id}", response_model=ProductRead)
async def get_product_endpoint(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    product = await get_product(db, product_id)
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product_endpoint(
    product_id: int,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    product = await update_product(db, product_id, body, current_user)
    return ProductRead.model_validate(product)


@router.post("/{product_id}/toggle-status", response_model=ProductRead)
async def toggle_product_status_endpoint(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    product = await toggle_product_status(db, product_id, current_user)
    return ProductRead.model_validate(product)


@router.get("/{product_id}/stock", response_model=ProductStockSummary)
async def get_product_stock_endpoint(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_product_stock_summary(db, product_id)
