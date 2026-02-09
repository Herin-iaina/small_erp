from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))

    # PIN for POS sensitive actions (hashed)
    hashed_pin: Mapped[str | None] = mapped_column(String(255))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Foreign keys
    company_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL")
    )
    role_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("roles.id", ondelete="SET NULL")
    )

    # Relationships
    company: Mapped["Company | None"] = relationship("Company", back_populates="users")  # noqa: F821
    role: Mapped["Role | None"] = relationship("Role", back_populates="users")  # noqa: F821

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def has_pin(self) -> bool:
        return self.hashed_pin is not None
