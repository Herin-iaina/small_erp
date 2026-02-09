from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.third_party import Address, Contact, ThirdParty
from app.schemas.third_party import (
    AddressCreate,
    AddressUpdate,
    ContactCreate,
    ContactUpdate,
    ThirdPartyCreate,
    ThirdPartyUpdate,
)
from app.utils.pagination import paginate


async def create_third_party(
    db: AsyncSession, data: ThirdPartyCreate
) -> ThirdParty:
    # Check code uniqueness
    existing = await db.execute(
        select(ThirdParty).where(ThirdParty.code == data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Third party code '{data.code}' already exists",
        )

    tp_data = data.model_dump(exclude={"addresses", "contacts"})
    tp = ThirdParty(**tp_data)

    for addr_data in data.addresses:
        tp.addresses.append(Address(**addr_data.model_dump()))

    for contact_data in data.contacts:
        tp.contacts.append(Contact(**contact_data.model_dump()))

    db.add(tp)
    await db.flush()
    return tp


async def get_third_party(db: AsyncSession, tp_id: int) -> ThirdParty:
    stmt = (
        select(ThirdParty)
        .options(selectinload(ThirdParty.addresses), selectinload(ThirdParty.contacts))
        .where(ThirdParty.id == tp_id)
    )
    result = await db.execute(stmt)
    tp = result.scalar_one_or_none()
    if not tp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Third party not found")
    return tp


async def list_third_parties(
    db: AsyncSession,
    company_id: int,
    *,
    is_customer: bool | None = None,
    is_supplier: bool | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = (
        select(ThirdParty)
        .where(ThirdParty.company_id == company_id, ThirdParty.is_active.is_(True))
        .order_by(ThirdParty.name)
    )
    if is_customer is not None:
        query = query.where(ThirdParty.is_customer == is_customer)
    if is_supplier is not None:
        query = query.where(ThirdParty.is_supplier == is_supplier)
    if search:
        query = query.where(
            ThirdParty.name.ilike(f"%{search}%")
            | ThirdParty.code.ilike(f"%{search}%")
        )
    return await paginate(db, query, page, page_size)


async def update_third_party(
    db: AsyncSession, tp_id: int, data: ThirdPartyUpdate
) -> ThirdParty:
    tp = await get_third_party(db, tp_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tp, field, value)
    await db.flush()
    return tp


# --- Address sub-resource ---
async def add_address(
    db: AsyncSession, tp_id: int, data: AddressCreate
) -> Address:
    await get_third_party(db, tp_id)  # ensure exists
    address = Address(third_party_id=tp_id, **data.model_dump())
    db.add(address)
    await db.flush()
    return address


async def update_address(
    db: AsyncSession, address_id: int, data: AddressUpdate
) -> Address:
    result = await db.execute(select(Address).where(Address.id == address_id))
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(address, field, value)
    await db.flush()
    return address


async def delete_address(db: AsyncSession, address_id: int) -> None:
    result = await db.execute(select(Address).where(Address.id == address_id))
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    await db.delete(address)


# --- Contact sub-resource ---
async def add_contact(
    db: AsyncSession, tp_id: int, data: ContactCreate
) -> Contact:
    await get_third_party(db, tp_id)
    contact = Contact(third_party_id=tp_id, **data.model_dump())
    db.add(contact)
    await db.flush()
    return contact


async def update_contact(
    db: AsyncSession, contact_id: int, data: ContactUpdate
) -> Contact:
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    await db.flush()
    return contact


async def delete_contact(db: AsyncSession, contact_id: int) -> None:
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    await db.delete(contact)
