from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PaymentTerm(Base):
    """Payment terms (e.g. 30 days net, 50% upfront + 50% at delivery)."""

    __tablename__ = "payment_terms"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Lines stored as JSON for flexibility:
    # [{"percentage": 50, "days": 0, "type": "immediate"},
    #  {"percentage": 50, "days": 30, "type": "net"}]
    lines: Mapped[list[dict]] = mapped_column(JSONB, default=list)

    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    company: Mapped["Company"] = relationship("Company", back_populates="payment_terms")  # noqa: F821
