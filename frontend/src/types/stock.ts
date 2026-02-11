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
