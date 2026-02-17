"""add stock_transfers, stock_transfer_lines, inventory_cycles tables

Revision ID: b1f2c3d4e5f6
Revises: a68398ec9324
Create Date: 2026-02-17 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f2c3d4e5f6'
down_revision: Union[str, None] = 'a68398ec9324'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_transfers",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("reference", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("source_warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("destination_warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("transfer_date", sa.Date, nullable=False),
        sa.Column("expected_arrival_date", sa.Date, nullable=True),
        sa.Column("actual_arrival_date", sa.Date, nullable=True),
        sa.Column("transporter", sa.String(255), nullable=True),
        sa.Column("tracking_number", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "stock_transfer_lines",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("transfer_id", sa.Integer, sa.ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lot_id", sa.Integer, sa.ForeignKey("lots.id", ondelete="SET NULL"), nullable=True),
        sa.Column("quantity_sent", sa.Numeric(12, 3), nullable=False),
        sa.Column("quantity_received", sa.Numeric(12, 3), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "inventory_cycles",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("frequency", sa.String(20), nullable=False),
        sa.Column("classification", sa.String(5), nullable=True),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("warehouse_id", sa.Integer, sa.ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("assigned_to_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("inventory_id", sa.Integer, sa.ForeignKey("inventories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), server_default="planned", nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("inventory_cycles")
    op.drop_table("stock_transfer_lines")
    op.drop_table("stock_transfers")
