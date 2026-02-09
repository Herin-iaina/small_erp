from datetime import datetime

from pydantic import BaseModel


class CompanyBase(BaseModel):
    name: str
    legal_name: str | None = None
    tax_id: str | None = None
    vat_number: str | None = None
    registration_number: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    zip_code: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    currency: str = "EUR"
    logo_url: str | None = None
    notes: str | None = None
    pos_stock_deduction: str = "on_payment"
    sale_stock_deduction: str = "on_delivery"
    discount_pin_threshold: float = 10.0
    sale_validation_threshold: float = 2000.0


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = None
    legal_name: str | None = None
    tax_id: str | None = None
    vat_number: str | None = None
    registration_number: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    zip_code: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    currency: str | None = None
    logo_url: str | None = None
    notes: str | None = None
    is_active: bool | None = None
    pos_stock_deduction: str | None = None
    sale_stock_deduction: str | None = None
    discount_pin_threshold: float | None = None
    sale_validation_threshold: float | None = None


class CompanyRead(CompanyBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
