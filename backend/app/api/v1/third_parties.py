from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.models.user import User
from app.schemas.third_party import (
    AddressCreate,
    AddressRead,
    AddressUpdate,
    ContactCreate,
    ContactRead,
    ContactUpdate,
    ThirdPartyCreate,
    ThirdPartyRead,
    ThirdPartyUpdate,
)
from app.services.third_party import (
    add_address,
    add_contact,
    create_third_party,
    delete_address,
    delete_contact,
    get_third_party,
    list_third_parties,
    update_address,
    update_contact,
    update_third_party,
)

router = APIRouter(prefix="/third-parties", tags=["Third Parties"])


@router.get("", response_model=dict)
async def list_third_parties_endpoint(
    company_id: int = Query(...),
    is_customer: bool | None = Query(None),
    is_supplier: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.view")),
):
    result = await list_third_parties(
        db,
        company_id,
        is_customer=is_customer,
        is_supplier=is_supplier,
        search=search,
        page=page,
        page_size=page_size,
    )
    result["items"] = [ThirdPartyRead.model_validate(tp) for tp in result["items"]]
    return result


@router.post("", response_model=ThirdPartyRead, status_code=201)
async def create_third_party_endpoint(
    body: ThirdPartyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.create")),
):
    tp = await create_third_party(db, body)
    return ThirdPartyRead.model_validate(tp)


@router.get("/{tp_id}", response_model=ThirdPartyRead)
async def get_third_party_endpoint(
    tp_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.view")),
):
    tp = await get_third_party(db, tp_id)
    return ThirdPartyRead.model_validate(tp)


@router.patch("/{tp_id}", response_model=ThirdPartyRead)
async def update_third_party_endpoint(
    tp_id: int,
    body: ThirdPartyUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.edit")),
):
    tp = await update_third_party(db, tp_id, body)
    return ThirdPartyRead.model_validate(tp)


# --- Addresses ---
@router.post("/{tp_id}/addresses", response_model=AddressRead, status_code=201)
async def add_address_endpoint(
    tp_id: int,
    body: AddressCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.edit")),
):
    addr = await add_address(db, tp_id, body)
    return AddressRead.model_validate(addr)


@router.patch("/addresses/{address_id}", response_model=AddressRead)
async def update_address_endpoint(
    address_id: int,
    body: AddressUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.edit")),
):
    addr = await update_address(db, address_id, body)
    return AddressRead.model_validate(addr)


@router.delete("/addresses/{address_id}", status_code=204)
async def delete_address_endpoint(
    address_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.delete")),
):
    await delete_address(db, address_id)


# --- Contacts ---
@router.post("/{tp_id}/contacts", response_model=ContactRead, status_code=201)
async def add_contact_endpoint(
    tp_id: int,
    body: ContactCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.edit")),
):
    contact = await add_contact(db, tp_id, body)
    return ContactRead.model_validate(contact)


@router.patch("/contacts/{contact_id}", response_model=ContactRead)
async def update_contact_endpoint(
    contact_id: int,
    body: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.edit")),
):
    contact = await update_contact(db, contact_id, body)
    return ContactRead.model_validate(contact)


@router.delete("/contacts/{contact_id}", status_code=204)
async def delete_contact_endpoint(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("third_party.delete")),
):
    await delete_contact(db, contact_id)
