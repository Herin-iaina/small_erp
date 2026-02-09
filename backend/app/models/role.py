from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Role(Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    company_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE")
    )
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False)
    multi_company: Mapped[bool] = mapped_column(Boolean, default=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)  # non-deletable

    # Permissions stored as JSON array: ["pos.view", "stock.*", ...]
    permissions: Mapped[list[str]] = mapped_column(JSONB, default=list)

    # Relationships
    company: Mapped["Company | None"] = relationship("Company", back_populates="roles")  # noqa: F821
    users: Mapped[list["User"]] = relationship("User", back_populates="role")  # noqa: F821
