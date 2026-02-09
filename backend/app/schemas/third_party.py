from datetime import datetime

from pydantic import BaseModel, EmailStr


# --- Address ---
class AddressBase(BaseModel):
    label: str = "Principal"
    address_line1: str
    address_line2: str | None = None
    city: str
    zip_code: str | None = None
    country: str = "France"
    is_default_billing: bool = False
    is_default_shipping: bool = False


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    label: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    zip_code: str | None = None
    country: str | None = None
    is_default_billing: bool | None = None
    is_default_shipping: bool | None = None


class AddressRead(AddressBase):
    id: int
    third_party_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Contact ---
class ContactBase(BaseModel):
    first_name: str
    last_name: str
    job_title: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    mobile: str | None = None
    is_primary: bool = False
    notes: str | None = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    job_title: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    mobile: str | None = None
    is_primary: bool | None = None
    notes: str | None = None


class ContactRead(ContactBase):
    id: int
    third_party_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Third Party ---
class ThirdPartyBase(BaseModel):
    code: str
    name: str
    legal_name: str | None = None
    tax_id: str | None = None
    vat_number: str | None = None
    is_customer: bool = False
    is_supplier: bool = False
    is_employee: bool = False
    customer_code: str | None = None
    supplier_code: str | None = None
    customer_credit_limit: float | None = None
    email: EmailStr | None = None
    phone: str | None = None
    mobile: str | None = None
    website: str | None = None
    notes: str | None = None
    tags: list[str] = []


class ThirdPartyCreate(ThirdPartyBase):
    company_id: int
    customer_payment_term_id: int | None = None
    supplier_payment_term_id: int | None = None
    addresses: list[AddressCreate] = []
    contacts: list[ContactCreate] = []


class ThirdPartyUpdate(BaseModel):
    name: str | None = None
    legal_name: str | None = None
    tax_id: str | None = None
    vat_number: str | None = None
    is_customer: bool | None = None
    is_supplier: bool | None = None
    is_employee: bool | None = None
    customer_code: str | None = None
    supplier_code: str | None = None
    customer_payment_term_id: int | None = None
    supplier_payment_term_id: int | None = None
    customer_credit_limit: float | None = None
    email: EmailStr | None = None
    phone: str | None = None
    mobile: str | None = None
    website: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    is_active: bool | None = None


class ThirdPartyRead(ThirdPartyBase):
    id: int
    company_id: int
    is_active: bool
    customer_payment_term_id: int | None
    supplier_payment_term_id: int | None
    addresses: list[AddressRead] = []
    contacts: list[ContactRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
