"""add units_of_measure table and unit_id/purchase_unit_id on products

Revision ID: c2d3e4f5g6h7
Revises: b1f2c3d4e5f6
Create Date: 2026-02-17 14:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5g6h7'
down_revision: Union[str, None] = 'b1f2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "units_of_measure",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False, index=True),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("base_unit_id", sa.Integer, sa.ForeignKey("units_of_measure.id", ondelete="SET NULL"), nullable=True),
        sa.Column("conversion_factor", sa.Numeric(15, 6), nullable=False, server_default="1"),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("symbol", "company_id", name="uq_uom_symbol_company"),
    )

    op.add_column("products", sa.Column("unit_id", sa.Integer, sa.ForeignKey("units_of_measure.id", ondelete="SET NULL"), nullable=True))
    op.add_column("products", sa.Column("purchase_unit_id", sa.Integer, sa.ForeignKey("units_of_measure.id", ondelete="SET NULL"), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "purchase_unit_id")
    op.drop_column("products", "unit_id")
    op.drop_table("units_of_measure")
