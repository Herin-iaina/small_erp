from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import StockAlert, StockKPIs, StockValuationItem
from app.services.stock_dashboard import (
    get_stock_alerts,
    get_stock_kpis,
    get_stock_valuation,
)

router = APIRouter(prefix="/stock-dashboard", tags=["Stock Dashboard"])


@router.get("/kpis", response_model=StockKPIs)
async def get_kpis_endpoint(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_stock_kpis(db, company_id)


@router.get("/alerts", response_model=list[StockAlert])
async def get_alerts_endpoint(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_stock_alerts(db, company_id)


@router.get("/valuation", response_model=list[StockValuationItem])
async def get_valuation_endpoint(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_stock_valuation(db, company_id)
