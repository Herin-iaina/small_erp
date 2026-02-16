"""add missing columns and tables from stock module complements

Revision ID: a68398ec9324
Revises:
Create Date: 2026-02-16 07:17:22.035978
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a68398ec9324'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- New columns on products ---
    op.add_column(
        "products",
        sa.Column("optimal_order_quantity", sa.Numeric(12, 3), server_default="0", nullable=False),
    )
    op.add_column(
        "products",
        sa.Column("average_daily_consumption", sa.Numeric(12, 3), server_default="0", nullable=False),
    )
    op.add_column(
        "products",
        sa.Column("abc_classification", sa.String(1), nullable=True),
    )

    # --- stock_reservations table ---
    op.create_table(
        "stock_reservations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_id", sa.Integer, sa.ForeignKey("stock_locations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lot_id", sa.Integer, sa.ForeignKey("lots.id", ondelete="SET NULL"), nullable=True),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("reference_type", sa.String(50), nullable=False),
        sa.Column("reference_id", sa.Integer, nullable=True),
        sa.Column("reference_label", sa.String(255), nullable=True),
        sa.Column("reserved_by_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reserved_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- product_barcodes table ---
    op.create_table(
        "product_barcodes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("barcode", sa.String(100), nullable=False, index=True),
        sa.Column("barcode_type", sa.String(20), server_default="EAN13", nullable=False),
        sa.Column("is_primary", sa.Boolean, server_default="false", nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("barcode", name="uq_product_barcode"),
    )


def downgrade() -> None:
    op.drop_table("product_barcodes")
    op.drop_table("stock_reservations")
    op.drop_column("products", "abc_classification")
    op.drop_column("products", "average_daily_consumption")
    op.drop_column("products", "optimal_order_quantity")
