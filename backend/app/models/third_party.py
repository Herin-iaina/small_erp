from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ThirdParty(Base):
    """Unified model for Client / Supplier / Employee.

    A third party can wear multiple hats (e.g. client AND supplier)
    through the boolean flags is_customer, is_supplier, is_employee.
    """

    __tablename__ = "third_parties"

    # Identity
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    legal_name: Mapped[str | None] = mapped_column(String(255))
    tax_id: Mapped[str | None] = mapped_column(String(50))
    vat_number: Mapped[str | None] = mapped_column(String(50))

    # Roles (multi-hat)
    is_customer: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_supplier: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_employee: Mapped[bool] = mapped_column(Boolean, default=False)

    # Customer-specific fields
    customer_code: Mapped[str | None] = mapped_column(String(50))
    customer_payment_term_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("payment_terms.id", ondelete="SET NULL")
    )
    customer_credit_limit: Mapped[float | None] = mapped_column(default=None)

    # Supplier-specific fields
    supplier_code: Mapped[str | None] = mapped_column(String(50))
    supplier_payment_term_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("payment_terms.id", ondelete="SET NULL")
    )

    # Contact info
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30))
    mobile: Mapped[str | None] = mapped_column(String(30))
    website: Mapped[str | None] = mapped_column(String(255))

    # Extra
    notes: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str] | None] = mapped_column(JSONB, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Tenant
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="third_parties")  # noqa: F821
    addresses: Mapped[list["Address"]] = relationship(
        "Address", back_populates="third_party", cascade="all, delete-orphan"
    )
    contacts: Mapped[list["Contact"]] = relationship(
        "Contact", back_populates="third_party", cascade="all, delete-orphan"
    )
    customer_payment_term: Mapped["PaymentTerm | None"] = relationship(  # noqa: F821
        "PaymentTerm", foreign_keys=[customer_payment_term_id]
    )
    supplier_payment_term: Mapped["PaymentTerm | None"] = relationship(  # noqa: F821
        "PaymentTerm", foreign_keys=[supplier_payment_term_id]
    )


class Address(Base):
    __tablename__ = "addresses"

    third_party_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("third_parties.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(100), default="Principal")
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    zip_code: Mapped[str | None] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(100), default="France")
    is_default_billing: Mapped[bool] = mapped_column(Boolean, default=False)
    is_default_shipping: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    third_party: Mapped["ThirdParty"] = relationship(
        "ThirdParty", back_populates="addresses"
    )


class Contact(Base):
    __tablename__ = "contacts"

    third_party_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("third_parties.id", ondelete="CASCADE"), nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    job_title: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30))
    mobile: Mapped[str | None] = mapped_column(String(30))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    third_party: Mapped["ThirdParty"] = relationship(
        "ThirdParty", back_populates="contacts"
    )
