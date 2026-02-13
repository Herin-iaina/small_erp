from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


# --- ProductCategory ---
class ProductCategoryBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    parent_id: int | None = None


class ProductCategoryCreate(ProductCategoryBase):
    company_id: int


class ProductCategoryUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    parent_id: int | None = None
    is_active: bool | None = None


class ProductCategoryRead(ProductCategoryBase):
    id: int
    company_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductCategoryTree(ProductCategoryRead):
    children: list["ProductCategoryTree"] = []


# --- Product ---
class ProductBase(BaseModel):
    sku: str
    barcode: str | None = None
    name: str
    description: str | None = None
    category_id: int | None = None
    product_type: str = "stockable"
    unit_of_measure: str = "pce"
    sale_price: Decimal = Decimal(0)
    cost_price: Decimal = Decimal(0)
    tax_rate: Decimal = Decimal("20.00")
    tracking_type: str = "none"
    valuation_method: str = "cump"
    min_stock_level: Decimal = Decimal(0)
    max_stock_level: Decimal = Decimal(0)
    reorder_point: Decimal = Decimal(0)
    reorder_quantity: Decimal = Decimal(0)
    optimal_order_quantity: Decimal = Decimal(0)
    weight: Decimal | None = None
    image_url: str | None = None
    lead_time_days: int = 0


class ProductCreate(ProductBase):
    company_id: int


class ProductUpdate(BaseModel):
    sku: str | None = None
    barcode: str | None = None
    name: str | None = None
    description: str | None = None
    category_id: int | None = None
    product_type: str | None = None
    unit_of_measure: str | None = None
    sale_price: Decimal | None = None
    cost_price: Decimal | None = None
    tax_rate: Decimal | None = None
    tracking_type: str | None = None
    valuation_method: str | None = None
    min_stock_level: Decimal | None = None
    max_stock_level: Decimal | None = None
    reorder_point: Decimal | None = None
    reorder_quantity: Decimal | None = None
    optimal_order_quantity: Decimal | None = None
    weight: Decimal | None = None
    image_url: str | None = None
    lead_time_days: int | None = None


class ProductRead(ProductBase):
    id: int
    company_id: int
    is_active: bool
    average_daily_consumption: Decimal = Decimal(0)
    abc_classification: str | None = None
    category: ProductCategoryRead | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductStockLocationDetail(BaseModel):
    location_id: int
    location_name: str
    lot_id: int | None = None
    lot_number: str | None = None
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal


class ProductStockSummary(BaseModel):
    product_id: int
    total_quantity: Decimal
    total_reserved: Decimal
    total_available: Decimal
    total_value: Decimal
    by_location: list[ProductStockLocationDetail] = []


# --- Warehouse ---
class WarehouseBase(BaseModel):
    name: str
    code: str
    address: str | None = None


class WarehouseCreate(WarehouseBase):
    company_id: int


class WarehouseUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    is_active: bool | None = None


class WarehouseRead(WarehouseBase):
    id: int
    company_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- StockLocation ---
class StockLocationBase(BaseModel):
    name: str
    code: str
    aisle: str | None = None
    shelf: str | None = None
    bin: str | None = None
    location_type: str = "storage"


class StockLocationCreate(StockLocationBase):
    company_id: int


class StockLocationUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    aisle: str | None = None
    shelf: str | None = None
    bin: str | None = None
    location_type: str | None = None
    is_active: bool | None = None


class StockLocationRead(StockLocationBase):
    id: int
    warehouse_id: int
    company_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Lot ---
class LotBase(BaseModel):
    lot_number: str
    expiry_date: date | None = None
    best_before_date: date | None = None
    manufacturing_date: date | None = None
    supplier_id: int | None = None
    notes: str | None = None


class LotCreate(LotBase):
    product_id: int
    company_id: int


class LotUpdate(BaseModel):
    lot_number: str | None = None
    expiry_date: date | None = None
    best_before_date: date | None = None
    manufacturing_date: date | None = None
    supplier_id: int | None = None
    notes: str | None = None
    is_active: bool | None = None


class LotProductInfo(BaseModel):
    id: int
    sku: str
    name: str

    model_config = {"from_attributes": True}


class LotSupplierInfo(BaseModel):
    id: int
    name: str
    code: str

    model_config = {"from_attributes": True}


class LotRead(LotBase):
    id: int
    product_id: int
    company_id: int
    is_active: bool
    product: LotProductInfo | None = None
    supplier: LotSupplierInfo | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- StockLevel ---
class StockLevelRead(BaseModel):
    id: int
    product_id: int
    location_id: int
    lot_id: int | None
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal
    company_id: int

    model_config = {"from_attributes": True}


# --- StockMovement ---
class StockMovementBase(BaseModel):
    movement_type: str
    product_id: int
    lot_id: int | None = None
    source_location_id: int | None = None
    destination_location_id: int | None = None
    quantity: Decimal
    unit_cost: Decimal | None = None
    reason: str | None = None
    notes: str | None = None


class StockMovementCreate(StockMovementBase):
    company_id: int


class StockMovementUpdate(BaseModel):
    reason: str | None = None
    notes: str | None = None


class MovementLocationInfo(BaseModel):
    id: int
    code: str
    name: str

    model_config = {"from_attributes": True}


class MovementProductInfo(BaseModel):
    id: int
    sku: str
    name: str
    unit_of_measure: str

    model_config = {"from_attributes": True}


class MovementLotInfo(BaseModel):
    id: int
    lot_number: str

    model_config = {"from_attributes": True}


class MovementUserInfo(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class StockMovementRead(BaseModel):
    id: int
    reference: str
    movement_type: str
    product_id: int
    lot_id: int | None
    source_location_id: int | None
    destination_location_id: int | None
    quantity: Decimal
    unit_cost: Decimal | None
    status: str
    reason: str | None
    notes: str | None
    validated_by_id: int | None
    validated_at: datetime | None
    company_id: int
    product: MovementProductInfo | None = None
    lot: MovementLotInfo | None = None
    source_location: MovementLocationInfo | None = None
    destination_location: MovementLocationInfo | None = None
    validated_by: MovementUserInfo | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Inventory ---
class InventoryBase(BaseModel):
    name: str
    warehouse_id: int
    notes: str | None = None


class InventoryCreate(InventoryBase):
    company_id: int


class InventoryLineProductInfo(BaseModel):
    id: int
    sku: str
    name: str

    model_config = {"from_attributes": True}


class InventoryLineLocationInfo(BaseModel):
    id: int
    code: str
    name: str

    model_config = {"from_attributes": True}


class InventoryLineLotInfo(BaseModel):
    id: int
    lot_number: str

    model_config = {"from_attributes": True}


class InventoryLineRead(BaseModel):
    id: int
    inventory_id: int
    product_id: int
    location_id: int
    lot_id: int | None
    expected_quantity: Decimal
    counted_quantity: Decimal | None
    difference: Decimal | None
    notes: str | None
    product: InventoryLineProductInfo | None = None
    location: InventoryLineLocationInfo | None = None
    lot: InventoryLineLotInfo | None = None

    model_config = {"from_attributes": True}


class InventoryLineUpdate(BaseModel):
    counted_quantity: Decimal | None = None
    notes: str | None = None


class InventoryLineCreate(BaseModel):
    product_id: int
    location_id: int
    lot_id: int | None = None
    expected_quantity: Decimal = Decimal(0)


class InventoryWarehouseInfo(BaseModel):
    id: int
    code: str
    name: str

    model_config = {"from_attributes": True}


class InventoryUserInfo(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class InventoryListRead(BaseModel):
    id: int
    reference: str
    name: str
    warehouse_id: int
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    notes: str | None
    created_by_id: int | None
    company_id: int
    warehouse: InventoryWarehouseInfo | None = None
    created_by: InventoryUserInfo | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryRead(InventoryListRead):
    lines: list[InventoryLineRead] = []


# --- StockReservation ---
class StockReservationBase(BaseModel):
    product_id: int
    location_id: int
    lot_id: int | None = None
    quantity: Decimal
    reference_type: str
    reference_id: int | None = None
    reference_label: str | None = None
    expiry_date: datetime | None = None
    notes: str | None = None


class StockReservationCreate(StockReservationBase):
    company_id: int


class ReservationProductInfo(BaseModel):
    id: int
    sku: str
    name: str
    unit_of_measure: str

    model_config = {"from_attributes": True}


class ReservationLocationInfo(BaseModel):
    id: int
    code: str
    name: str

    model_config = {"from_attributes": True}


class ReservationLotInfo(BaseModel):
    id: int
    lot_number: str

    model_config = {"from_attributes": True}


class ReservationUserInfo(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class StockReservationRead(BaseModel):
    id: int
    product_id: int
    location_id: int
    lot_id: int | None
    quantity: Decimal
    reference_type: str
    reference_id: int | None
    reference_label: str | None
    reserved_by_id: int | None
    reserved_date: datetime
    expiry_date: datetime | None
    status: str
    notes: str | None
    company_id: int
    product: ReservationProductInfo | None = None
    location: ReservationLocationInfo | None = None
    lot: ReservationLotInfo | None = None
    reserved_by: ReservationUserInfo | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReleaseByReferenceRequest(BaseModel):
    reference_type: str
    reference_id: int


class ProductAvailability(BaseModel):
    product_id: int
    product_name: str
    sku: str
    physical_stock: Decimal
    reserved_stock: Decimal
    available_stock: Decimal
    by_location: list[ProductStockLocationDetail] = []


# --- ProductBarcode ---
class ProductBarcodeBase(BaseModel):
    barcode: str
    barcode_type: str = "EAN13"
    is_primary: bool = False


class ProductBarcodeCreate(ProductBarcodeBase):
    pass


class ProductBarcodeRead(ProductBarcodeBase):
    id: int
    product_id: int
    company_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Replenishment ---
class ReplenishmentSuggestion(BaseModel):
    product_id: int
    product_name: str
    sku: str
    category_name: str | None = None
    current_stock: Decimal
    reserved_stock: Decimal
    available_stock: Decimal
    reorder_point: Decimal
    suggested_quantity: Decimal
    lead_time_days: int
    estimated_cost: Decimal
    abc_classification: str | None = None


class ConsumptionStats(BaseModel):
    product_id: int
    avg_7d: Decimal
    avg_30d: Decimal
    avg_90d: Decimal
    total_out_7d: Decimal
    total_out_30d: Decimal
    total_out_90d: Decimal


# --- Dashboard ---
class StockKPIs(BaseModel):
    total_products: int = 0
    total_stock_value: Decimal = Decimal(0)
    low_stock_count: int = 0
    out_of_stock_count: int = 0
    expiring_soon_count: int = 0


class StockAlert(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: Decimal
    min_stock_level: Decimal
    reorder_point: Decimal


class StockValuationItem(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity: Decimal
    unit_cost: Decimal
    total_value: Decimal
