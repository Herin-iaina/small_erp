from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import ReplenishmentSuggestion
from app.services.replenishment import (
    calculate_abc_classification,
    calculate_reorder_points,
    get_replenishment_suggestions,
)

router = APIRouter(prefix="/stock", tags=["Stock Replenishment"])


@router.get("/replenishment-suggestions", response_model=list[ReplenishmentSuggestion])
async def replenishment_suggestions_endpoint(
    company_id: int = Query(...),
    category_id: int | None = Query(None),
    abc_classification: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    return await get_replenishment_suggestions(
        db, company_id, category_id=category_id, abc_classification=abc_classification
    )


@router.post("/calculate-reorder-points", response_model=dict)
async def calculate_reorder_points_endpoint(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.edit")),
):
    count = await calculate_reorder_points(db, company_id)
    return {"updated_count": count}


@router.post("/calculate-abc-classification", response_model=dict)
async def calculate_abc_endpoint(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.edit")),
):
    counts = await calculate_abc_classification(db, company_id)
    return {"classifications": counts}
