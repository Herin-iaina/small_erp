from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ProductCategory(Base):
    __tablename__ = "product_categories"
    __table_args__ = (
        UniqueConstraint("code", "company_id", name="uq_category_code_company"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product_categories.id", ondelete="SET NULL")
    )
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    parent: Mapped["ProductCategory | None"] = relationship(
        "ProductCategory", remote_side="ProductCategory.id", back_populates="children"
    )
    children: Mapped[list["ProductCategory"]] = relationship(
        "ProductCategory", back_populates="parent"
    )
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="category"
    )
    company: Mapped["Company"] = relationship("Company")  # noqa: F821


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("sku", "company_id", name="uq_product_sku_company"),
    )

    sku: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    barcode: Mapped[str | None] = mapped_column(String(100), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product_categories.id", ondelete="SET NULL")
    )
    product_type: Mapped[str] = mapped_column(String(20), default="stockable")
    unit_of_measure: Mapped[str] = mapped_column(String(20), default="pce")
    sale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=20.00)
    tracking_type: Mapped[str] = mapped_column(String(20), default="none")
    valuation_method: Mapped[str] = mapped_column(String(10), default="cump")
    min_stock_level: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    max_stock_level: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    reorder_point: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    reorder_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    weight: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    image_url: Mapped[str | None] = mapped_column(String(500))
    lead_time_days: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    category: Mapped["ProductCategory | None"] = relationship(
        "ProductCategory", back_populates="products"
    )
    lots: Mapped[list["Lot"]] = relationship("Lot", back_populates="product")
    stock_levels: Mapped[list["StockLevel"]] = relationship(
        "StockLevel", back_populates="product"
    )
    company: Mapped["Company"] = relationship("Company")  # noqa: F821


class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = (
        UniqueConstraint("code", "company_id", name="uq_warehouse_code_company"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    locations: Mapped[list["StockLocation"]] = relationship(
        "StockLocation", back_populates="warehouse", cascade="all, delete-orphan"
    )
    company: Mapped["Company"] = relationship("Company")  # noqa: F821


class StockLocation(Base):
    __tablename__ = "stock_locations"

    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    aisle: Mapped[str | None] = mapped_column(String(50))
    shelf: Mapped[str | None] = mapped_column(String(50))
    bin: Mapped[str | None] = mapped_column(String(50))
    location_type: Mapped[str] = mapped_column(String(20), default="storage")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", back_populates="locations"
    )
    stock_levels: Mapped[list["StockLevel"]] = relationship(
        "StockLevel", back_populates="location"
    )
    company: Mapped["Company"] = relationship("Company")  # noqa: F821


class Lot(Base):
    __tablename__ = "lots"
    __table_args__ = (
        UniqueConstraint("lot_number", "product_id", name="uq_lot_number_product"),
    )

    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    lot_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    best_before_date: Mapped[date | None] = mapped_column(Date)
    manufacturing_date: Mapped[date | None] = mapped_column(Date)
    supplier_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("third_parties.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="lots")
    supplier: Mapped["ThirdParty | None"] = relationship("ThirdParty")  # noqa: F821
    stock_levels: Mapped[list["StockLevel"]] = relationship(
        "StockLevel", back_populates="lot"
    )
    company: Mapped["Company"] = relationship("Company")  # noqa: F821


class StockLevel(Base):
    __tablename__ = "stock_levels"
    __table_args__ = (
        UniqueConstraint(
            "product_id", "location_id", "lot_id",
            name="uq_stock_level_product_location_lot",
        ),
    )

    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stock_locations.id", ondelete="CASCADE"), nullable=False
    )
    lot_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lots.id", ondelete="SET NULL")
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    reserved_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="stock_levels")
    location: Mapped["StockLocation"] = relationship(
        "StockLocation", back_populates="stock_levels"
    )
    lot: Mapped["Lot | None"] = relationship("Lot", back_populates="stock_levels")
    company: Mapped["Company"] = relationship("Company")  # noqa: F821

    @property
    def available_quantity(self) -> Decimal:
        return (self.quantity or Decimal(0)) - (self.reserved_quantity or Decimal(0))


class StockMovement(Base):
    __tablename__ = "stock_movements"

    reference: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    lot_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lots.id", ondelete="SET NULL")
    )
    source_location_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("stock_locations.id", ondelete="SET NULL")
    )
    destination_location_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("stock_locations.id", ondelete="SET NULL")
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    reason: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    validated_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product")
    lot: Mapped["Lot | None"] = relationship("Lot")
    source_location: Mapped["StockLocation | None"] = relationship(
        "StockLocation", foreign_keys=[source_location_id]
    )
    destination_location: Mapped["StockLocation | None"] = relationship(
        "StockLocation", foreign_keys=[destination_location_id]
    )
    validated_by: Mapped["User | None"] = relationship("User")  # noqa: F821
    company: Mapped["Company"] = relationship("Company")  # noqa: F821


class Inventory(Base):
    __tablename__ = "inventories"

    reference: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="draft")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship("Warehouse")
    lines: Mapped[list["InventoryLine"]] = relationship(
        "InventoryLine", back_populates="inventory", cascade="all, delete-orphan"
    )
    created_by: Mapped["User | None"] = relationship("User")  # noqa: F821
    company: Mapped["Company"] = relationship("Company")  # noqa: F821


class InventoryLine(Base):
    __tablename__ = "inventory_lines"

    inventory_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("inventories.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stock_locations.id", ondelete="CASCADE"), nullable=False
    )
    lot_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lots.id", ondelete="SET NULL")
    )
    expected_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    counted_quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    notes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    inventory: Mapped["Inventory"] = relationship("Inventory", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")
    location: Mapped["StockLocation"] = relationship("StockLocation")
    lot: Mapped["Lot | None"] = relationship("Lot")

    @property
    def difference(self) -> Decimal | None:
        if self.counted_quantity is None:
            return None
        return self.counted_quantity - self.expected_quantity
