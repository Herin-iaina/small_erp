from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.stock import (
    StockTransferCreate,
    StockTransferListRead,
    StockTransferRead,
    StockTransferUpdate,
    TransferReceiveBody,
    TransferShipBody,
)
from app.services.stock_transfer import (
    cancel_transfer,
    create_transfer,
    get_transfer,
    list_transfers,
    receive_transfer,
    ship_transfer,
    update_transfer,
    validate_transfer,
)

router = APIRouter(prefix="/stock-transfers", tags=["Stock Transfers"])


@router.get("", response_model=dict)
async def list_transfers_endpoint(
    company_id: int = Query(...),
    status: str | None = Query(None),
    warehouse_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    result = await list_transfers(
        db, company_id,
        status_filter=status, warehouse_id=warehouse_id,
        search=search, page=page, page_size=page_size,
    )
    result["items"] = [StockTransferListRead.model_validate(i) for i in result["items"]]
    return result


@router.post("", response_model=StockTransferRead, status_code=201)
async def create_transfer_endpoint(
    body: StockTransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.create")),
):
    transfer = await create_transfer(db, body, current_user)
    return StockTransferRead.model_validate(transfer)


@router.get("/{transfer_id}", response_model=StockTransferRead)
async def get_transfer_endpoint(
    transfer_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("stock.view")),
):
    transfer = await get_transfer(db, transfer_id)
    return StockTransferRead.model_validate(transfer)


@router.patch("/{transfer_id}", response_model=StockTransferRead)
async def update_transfer_endpoint(
    transfer_id: int,
    body: StockTransferUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    transfer = await update_transfer(db, transfer_id, body, current_user)
    return StockTransferRead.model_validate(transfer)


@router.post("/{transfer_id}/validate", response_model=StockTransferRead)
async def validate_transfer_endpoint(
    transfer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    transfer = await validate_transfer(db, transfer_id, current_user)
    return StockTransferRead.model_validate(transfer)


@router.post("/{transfer_id}/ship", response_model=StockTransferRead)
async def ship_transfer_endpoint(
    transfer_id: int,
    body: TransferShipBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.edit")),
):
    transfer = await ship_transfer(db, transfer_id, body, current_user)
    return StockTransferRead.model_validate(transfer)


@router.post("/{transfer_id}/receive", response_model=StockTransferRead)
async def receive_transfer_endpoint(
    transfer_id: int,
    body: TransferReceiveBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    transfer = await receive_transfer(db, transfer_id, body, current_user)
    return StockTransferRead.model_validate(transfer)


@router.post("/{transfer_id}/cancel", response_model=StockTransferRead)
async def cancel_transfer_endpoint(
    transfer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("stock.validate")),
):
    transfer = await cancel_transfer(db, transfer_id, current_user)
    return StockTransferRead.model_validate(transfer)
