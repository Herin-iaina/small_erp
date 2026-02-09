from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Company(Base):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(255))
    tax_id: Mapped[str | None] = mapped_column(String(50))  # SIRET / NIF
    vat_number: Mapped[str | None] = mapped_column(String(50))
    registration_number: Mapped[str | None] = mapped_column(String(100))

    # Address
    address_line1: Mapped[str | None] = mapped_column(String(255))
    address_line2: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))
    zip_code: Mapped[str | None] = mapped_column(String(20))
    country: Mapped[str | None] = mapped_column(String(100))

    # Contact
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255))

    # Settings
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    logo_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)

    # Stock workflow settings
    pos_stock_deduction: Mapped[str] = mapped_column(
        String(20), default="on_payment"
    )  # on_payment | on_close
    sale_stock_deduction: Mapped[str] = mapped_column(
        String(20), default="on_delivery"
    )  # on_order | on_delivery

    # Threshold settings
    discount_pin_threshold: Mapped[float] = mapped_column(default=10.0)  # % discount requiring PIN
    sale_validation_threshold: Mapped[float] = mapped_column(default=2000.0)  # amount requiring validation

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="company")  # noqa: F821
    roles: Mapped[list["Role"]] = relationship("Role", back_populates="company")  # noqa: F821
    third_parties: Mapped[list["ThirdParty"]] = relationship(  # noqa: F821
        "ThirdParty", back_populates="company"
    )
    payment_terms: Mapped[list["PaymentTerm"]] = relationship(  # noqa: F821
        "PaymentTerm", back_populates="company"
    )
