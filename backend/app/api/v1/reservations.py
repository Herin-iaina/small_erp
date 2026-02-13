from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import (
    ReleaseByReferenceRequest,
    StockReservationCreate,
    StockReservationRead,
)
from app.services.reservation import (
    create_reservation,
    list_reservations,
    release_by_reference,
    release_reservation,
)

router = APIRouter(prefix="/stock/reservations", tags=["Stock Reservations"])


@router.get("", response_model=dict)
async def list_reservations_endpoint(
    company_id: int = Query(...),
    product_id: int | None = Query(None),
    status: str | None = Query(None),
    reference_type: str | None = Query(None),
    reference_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_reservations(
        db,
        company_id,
        product_id=product_id,
        status_filter=status,
        reference_type=reference_type,
        reference_id=reference_id,
        search=search,
        page=page,
        page_size=page_size,
    )
    result["items"] = [StockReservationRead.model_validate(r) for r in result["items"]]
    return result


@router.post("", response_model=StockReservationRead, status_code=201)
async def create_reservation_endpoint(
    body: StockReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    reservation = await create_reservation(db, body, current_user)
    return StockReservationRead.model_validate(reservation)


@router.delete("/{reservation_id}", status_code=204)
async def release_reservation_endpoint(
    reservation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    await release_reservation(db, reservation_id, current_user)


@router.post("/release", response_model=dict)
async def release_by_reference_endpoint(
    body: ReleaseByReferenceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    count = await release_by_reference(
        db, body.reference_type, body.reference_id, current_user
    )
    return {"released_count": count}
