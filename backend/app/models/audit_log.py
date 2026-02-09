from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuditLog(Base):
    """Immutable audit trail for sensitive actions."""

    __tablename__ = "audit_logs"

    # Who
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # What
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(50))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)

    # Context
    company_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL")
    )
    ip_address: Mapped[str | None] = mapped_column(String(45))

    # PIN authorization tracking
    authorized_by_user_id: Mapped[int | None] = mapped_column(Integer)
    authorized_by_email: Mapped[str | None] = mapped_column(String(255))
    pin_verified: Mapped[bool | None] = mapped_column(default=None)

    # Data snapshot (before/after)
    old_values: Mapped[dict | None] = mapped_column(JSONB, default=None)
    new_values: Mapped[dict | None] = mapped_column(JSONB, default=None)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
