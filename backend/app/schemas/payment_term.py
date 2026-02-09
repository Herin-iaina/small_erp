from datetime import datetime

from pydantic import BaseModel


class PaymentTermLineSchema(BaseModel):
    percentage: float
    days: int
    type: str  # "immediate" | "net" | "end_of_month"


class PaymentTermBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    lines: list[PaymentTermLineSchema] = []


class PaymentTermCreate(PaymentTermBase):
    company_id: int


class PaymentTermUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    lines: list[PaymentTermLineSchema] | None = None


class PaymentTermRead(PaymentTermBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
