// --- ProductCategory ---
export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  parent_id: number | null;
  company_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: ProductCategory[];
}

// --- Product ---
export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: number | null;
  product_type: string;
  unit_of_measure: string;
  sale_price: number;
  cost_price: number;
  tax_rate: number;
  tracking_type: string;
  valuation_method: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  reorder_quantity: number;
  optimal_order_quantity: number;
  average_daily_consumption: number;
  abc_classification: string | null;
  weight: number | null;
  image_url: string | null;
  lead_time_days: number;
  company_id: number;
  is_active: boolean;
  category: ProductCategory | null;
  created_at: string;
  updated_at: string;
}

// --- Warehouse ---
export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string | null;
  company_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- StockLocation ---
export interface StockLocation {
  id: number;
  warehouse_id: number;
  name: string;
  code: string;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  location_type: string;
  company_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Lot ---
export interface Lot {
  id: number;
  product_id: number;
  lot_number: string;
  expiry_date: string | null;
  best_before_date: string | null;
  manufacturing_date: string | null;
  supplier_id: number | null;
  notes: string | null;
  company_id: number;
  is_active: boolean;
  product: { id: number; sku: string; name: string } | null;
  supplier: { id: number; name: string; code: string } | null;
  total_quantity?: number;
  total_reserved?: number;
  total_available?: number;
  created_at: string;
  updated_at: string;
}

// --- StockLevel ---
export interface StockLevel {
  id: number;
  product_id: number;
  location_id: number;
  lot_id: number | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  company_id: number;
}

// --- StockMovement ---
export interface StockMovement {
  id: number;
  reference: string;
  movement_type: string;
  product_id: number;
  lot_id: number | null;
  source_location_id: number | null;
  destination_location_id: number | null;
  quantity: number;
  unit_cost: number | null;
  status: string;
  reason: string | null;
  notes: string | null;
  validated_by_id: number | null;
  validated_at: string | null;
  company_id: number;
  product: { id: number; sku: string; name: string; unit_of_measure: string } | null;
  lot: { id: number; lot_number: string } | null;
  source_location: { id: number; code: string; name: string } | null;
  destination_location: { id: number; code: string; name: string } | null;
  validated_by: { id: number; email: string; first_name: string; last_name: string } | null;
  created_at: string;
  updated_at: string;
}

// --- Inventory ---
export interface InventoryLine {
  id: number;
  inventory_id: number;
  product_id: number;
  location_id: number;
  lot_id: number | null;
  expected_quantity: number;
  counted_quantity: number | null;
  difference: number | null;
  notes: string | null;
  product: { id: number; sku: string; name: string } | null;
  location: { id: number; code: string; name: string } | null;
  lot: { id: number; lot_number: string } | null;
}

export interface Inventory {
  id: number;
  reference: string;
  name: string;
  warehouse_id: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by_id: number | null;
  company_id: number;
  warehouse: { id: number; code: string; name: string } | null;
  created_by: { id: number; email: string; first_name: string; last_name: string } | null;
  lines: InventoryLine[];
  created_at: string;
  updated_at: string;
}

// --- Dashboard ---
export interface StockKPIs {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
}

export interface StockAlert {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  min_stock_level: number;
  reorder_point: number;
}

export interface StockValuationItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
}

// --- Product Stock Summary ---
export interface ProductStockLocationDetail {
  location_id: number;
  location_name: string;
  lot_id: number | null;
  lot_number: string | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}

export interface ProductStockSummary {
  product_id: number;
  total_quantity: number;
  total_reserved: number;
  total_available: number;
  total_value: number;
  by_location: ProductStockLocationDetail[];
}

// --- Stock Reservation ---
export interface StockReservation {
  id: number;
  product_id: number;
  location_id: number;
  lot_id: number | null;
  quantity: number;
  reference_type: string;
  reference_id: number | null;
  reference_label: string | null;
  reserved_by_id: number | null;
  reserved_date: string;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  company_id: number;
  product: { id: number; sku: string; name: string; unit_of_measure: string } | null;
  location: { id: number; code: string; name: string } | null;
  lot: { id: number; lot_number: string } | null;
  reserved_by: { id: number; email: string; first_name: string; last_name: string } | null;
  created_at: string;
  updated_at: string;
}

// --- Product Barcode ---
export interface ProductBarcode {
  id: number;
  product_id: number;
  barcode: string;
  barcode_type: string;
  is_primary: boolean;
  company_id: number;
  created_at: string;
}

// --- Product Availability ---
export interface ProductAvailability {
  product_id: number;
  product_name: string;
  sku: string;
  physical_stock: number;
  reserved_stock: number;
  available_stock: number;
  by_location: ProductStockLocationDetail[];
}

// --- Replenishment ---
export interface ReplenishmentSuggestion {
  product_id: number;
  product_name: string;
  sku: string;
  category_name: string | null;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_point: number;
  suggested_quantity: number;
  lead_time_days: number;
  estimated_cost: number;
  abc_classification: string | null;
}

// --- StockTransfer ---
export interface StockTransferLine {
  id: number;
  transfer_id: number;
  product_id: number;
  lot_id: number | null;
  quantity_sent: number;
  quantity_received: number | null;
  product: { id: number; sku: string; name: string } | null;
  lot: { id: number; lot_number: string } | null;
}

export interface StockTransfer {
  id: number;
  reference: string;
  source_warehouse_id: number;
  destination_warehouse_id: number;
  status: string;
  transfer_date: string;
  expected_arrival_date: string | null;
  actual_arrival_date: string | null;
  transporter: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_by_id: number | null;
  company_id: number;
  source_warehouse: { id: number; code: string; name: string } | null;
  destination_warehouse: { id: number; code: string; name: string } | null;
  created_by: { id: number; email: string; first_name: string; last_name: string } | null;
  lines: StockTransferLine[];
  created_at: string;
  updated_at: string;
}

// --- InventoryCycle ---
export interface InventoryCycle {
  id: number;
  name: string;
  frequency: string;
  classification: string | null;
  category_id: number | null;
  warehouse_id: number;
  start_date: string;
  end_date: string;
  assigned_to_id: number | null;
  inventory_id: number | null;
  status: string;
  company_id: number;
  warehouse: { id: number; code: string; name: string } | null;
  category: { id: number; code: string; name: string } | null;
  assigned_to: { id: number; email: string; first_name: string; last_name: string } | null;
  inventory: Inventory | null;
  created_at: string;
  updated_at: string;
}

// --- Consumption Stats ---
export interface ConsumptionStats {
  product_id: number;
  avg_7d: number;
  avg_30d: number;
  avg_90d: number;
  total_out_7d: number;
  total_out_30d: number;
  total_out_90d: number;
}
