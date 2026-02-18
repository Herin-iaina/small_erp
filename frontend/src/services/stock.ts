import api from "./api";
import type { PaginatedResponse } from "@/types/api";
import type {
  Product,
  ProductCategory,
  ProductStockSummary,
  ProductAvailability,
  ProductBarcode,
  Warehouse,
  StockLocation,
  Lot,
  StockMovement,
  StockReservation,
  Inventory,
  UnitOfMeasure,
  StockTransfer,
  InventoryCycle,
  StockKPIs,
  StockAlert,
  StockValuationItem,
  ReplenishmentSuggestion,
  ConsumptionStats,
} from "@/types/stock";

// --- Units of Measure ---

export interface UnitListParams {
  [key: string]: unknown;
  company_id: number;
  category?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export async function listUnits(params: UnitListParams): Promise<PaginatedResponse<UnitOfMeasure>> {
  const { data } = await api.get("/units", { params });
  return data;
}

export async function getUnit(id: number): Promise<UnitOfMeasure> {
  const { data } = await api.get(`/units/${id}`);
  return data;
}

export async function createUnit(body: {
  name: string;
  symbol: string;
  category: string;
  base_unit_id?: number | null;
  conversion_factor?: number;
  company_id: number;
}): Promise<UnitOfMeasure> {
  const { data } = await api.post("/units", body);
  return data;
}

export async function updateUnit(id: number, body: {
  name?: string;
  symbol?: string;
  category?: string;
  base_unit_id?: number | null;
  conversion_factor?: number;
  is_active?: boolean;
}): Promise<UnitOfMeasure> {
  const { data } = await api.patch(`/units/${id}`, body);
  return data;
}

export async function getUnitConversions(id: number): Promise<{ unit_id: number; symbol: string; name: string; conversion_factor: number }[]> {
  const { data } = await api.get(`/units/${id}/conversions`);
  return data;
}

export async function seedUnits(companyId: number): Promise<UnitOfMeasure[]> {
  const { data } = await api.post("/units/seed", null, { params: { company_id: companyId } });
  return data;
}

// --- Categories ---

export interface CategoryListParams {
  [key: string]: unknown;
  company_id: number;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export async function listCategories(params: CategoryListParams): Promise<PaginatedResponse<ProductCategory>> {
  const { data } = await api.get("/categories", { params });
  return data;
}

export async function createCategory(body: Partial<ProductCategory> & { company_id: number }): Promise<ProductCategory> {
  const { data } = await api.post("/categories", body);
  return data;
}

export async function updateCategory(id: number, body: Partial<ProductCategory>): Promise<ProductCategory> {
  const { data } = await api.patch(`/categories/${id}`, body);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// --- Products ---

export interface ProductListParams {
  [key: string]: unknown;
  company_id: number;
  category_id?: number;
  product_type?: string;
  is_active?: boolean;
  tracking_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function listProducts(params: ProductListParams): Promise<PaginatedResponse<Product>> {
  const { data } = await api.get("/products", { params });
  return data;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export async function createProduct(body: Partial<Product> & { company_id: number }): Promise<Product> {
  const { data } = await api.post("/products", body);
  return data;
}

export async function updateProduct(id: number, body: Partial<Product>): Promise<Product> {
  const { data } = await api.patch(`/products/${id}`, body);
  return data;
}

export async function toggleProductStatus(id: number): Promise<Product> {
  const { data } = await api.post(`/products/${id}/toggle-status`);
  return data;
}

export async function getProductStock(id: number): Promise<ProductStockSummary> {
  const { data } = await api.get(`/products/${id}/stock`);
  return data;
}

export async function listUomValues(companyId: number): Promise<string[]> {
  const { data } = await api.get("/products/uom-values", { params: { company_id: companyId } });
  return data;
}

export async function listSuppliers(companyId: number): Promise<{ id: number; name: string; code: string }[]> {
  const { data } = await api.get("/third-parties", { params: { company_id: companyId, is_supplier: true, page_size: 200 } });
  return data.items;
}

// --- Warehouses ---

export interface WarehouseListParams {
  [key: string]: unknown;
  company_id: number;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export async function listWarehouses(params: WarehouseListParams): Promise<PaginatedResponse<Warehouse>> {
  const { data } = await api.get("/warehouses", { params });
  return data;
}

export async function getWarehouse(id: number): Promise<Warehouse> {
  const { data } = await api.get(`/warehouses/${id}`);
  return data;
}

export async function createWarehouse(body: Partial<Warehouse> & { company_id: number }): Promise<Warehouse> {
  const { data } = await api.post("/warehouses", body);
  return data;
}

export async function updateWarehouse(id: number, body: Partial<Warehouse>): Promise<Warehouse> {
  const { data } = await api.patch(`/warehouses/${id}`, body);
  return data;
}

// --- Locations ---

export interface LocationListParams {
  [key: string]: unknown;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export async function listLocations(warehouseId: number, params: LocationListParams = {}): Promise<PaginatedResponse<StockLocation>> {
  const { data } = await api.get(`/warehouses/${warehouseId}/locations`, { params });
  return data;
}

export async function createLocation(warehouseId: number, body: Partial<StockLocation> & { company_id: number }): Promise<StockLocation> {
  const { data } = await api.post(`/warehouses/${warehouseId}/locations`, body);
  return data;
}

export async function updateLocation(id: number, body: Partial<StockLocation>): Promise<StockLocation> {
  const { data } = await api.patch(`/warehouses/locations/${id}`, body);
  return data;
}

export async function deleteLocation(id: number): Promise<void> {
  await api.delete(`/warehouses/locations/${id}`);
}

// --- Lots ---

export interface LotListParams {
  [key: string]: unknown;
  company_id: number;
  product_id?: number;
  is_expired?: boolean;
  expiring_within_days?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function listLots(params: LotListParams): Promise<PaginatedResponse<Lot>> {
  const { data } = await api.get("/lots", { params });
  return data;
}

export async function getLot(id: number): Promise<Lot> {
  const { data } = await api.get(`/lots/${id}`);
  return data;
}

export async function createLot(body: Partial<Lot> & { product_id: number; company_id: number }): Promise<Lot> {
  const { data } = await api.post("/lots", body);
  return data;
}

export async function updateLot(id: number, body: Partial<Lot>): Promise<Lot> {
  const { data } = await api.patch(`/lots/${id}`, body);
  return data;
}

// --- Stock Movements ---

export interface MovementListParams {
  [key: string]: unknown;
  company_id: number;
  movement_type?: string;
  status?: string;
  product_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function listMovements(params: MovementListParams): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await api.get("/stock-movements", { params });
  return data;
}

export async function getMovement(id: number): Promise<StockMovement> {
  const { data } = await api.get(`/stock-movements/${id}`);
  return data;
}

export async function createMovement(body: {
  movement_type: string;
  product_id: number;
  lot_id?: number | null;
  source_location_id?: number | null;
  destination_location_id?: number | null;
  quantity: number;
  unit_cost?: number | null;
  reason?: string;
  notes?: string;
  company_id: number;
}): Promise<StockMovement> {
  const { data } = await api.post("/stock-movements", body);
  return data;
}

export async function updateMovement(id: number, body: { reason?: string; notes?: string }): Promise<StockMovement> {
  const { data } = await api.patch(`/stock-movements/${id}`, body);
  return data;
}

export async function validateMovement(id: number): Promise<StockMovement> {
  const { data } = await api.post(`/stock-movements/${id}/validate`);
  return data;
}

export async function cancelMovement(id: number): Promise<StockMovement> {
  const { data } = await api.post(`/stock-movements/${id}/cancel`);
  return data;
}

// --- Inventories ---

export interface InventoryListParams {
  [key: string]: unknown;
  company_id: number;
  status?: string;
  warehouse_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function listInventories(params: InventoryListParams): Promise<PaginatedResponse<Inventory>> {
  const { data } = await api.get("/inventories", { params });
  return data;
}

export async function getInventory(id: number): Promise<Inventory> {
  const { data } = await api.get(`/inventories/${id}`);
  return data;
}

export async function createInventory(body: { name: string; warehouse_id: number; notes?: string; company_id: number }): Promise<Inventory> {
  const { data } = await api.post("/inventories", body);
  return data;
}

export async function addInventoryLine(inventoryId: number, body: { product_id: number; location_id: number; lot_id?: number | null; expected_quantity?: number }): Promise<Inventory> {
  const { data } = await api.post(`/inventories/${inventoryId}/lines`, body);
  return data;
}

export async function startInventory(id: number): Promise<Inventory> {
  const { data } = await api.post(`/inventories/${id}/start`);
  return data;
}

export async function updateInventoryLine(inventoryId: number, lineId: number, body: { counted_quantity?: number; notes?: string }): Promise<Inventory> {
  const { data } = await api.patch(`/inventories/${inventoryId}/lines/${lineId}`, body);
  return data;
}

export async function validateInventory(id: number): Promise<Inventory> {
  const { data } = await api.post(`/inventories/${id}/validate`);
  return data;
}

export async function cancelInventory(id: number): Promise<Inventory> {
  const { data } = await api.post(`/inventories/${id}/cancel`);
  return data;
}

// --- Dashboard ---

export async function getStockKPIs(companyId: number): Promise<StockKPIs> {
  const { data } = await api.get("/stock-dashboard/kpis", { params: { company_id: companyId } });
  return data;
}

export async function getStockAlerts(companyId: number): Promise<StockAlert[]> {
  const { data } = await api.get("/stock-dashboard/alerts", { params: { company_id: companyId } });
  return data;
}

export async function getStockValuation(companyId: number): Promise<StockValuationItem[]> {
  const { data } = await api.get("/stock-dashboard/valuation", { params: { company_id: companyId } });
  return data;
}

export async function getProductStockTotals(companyId: number): Promise<Record<string, number>> {
  const { data } = await api.get("/stock-dashboard/product-stock-totals", { params: { company_id: companyId } });
  return data;
}

// --- Product Availability & Barcodes ---

export async function getProductAvailability(id: number): Promise<ProductAvailability> {
  const { data } = await api.get(`/products/${id}/availability`);
  return data;
}

export async function getConsumptionStats(id: number): Promise<ConsumptionStats> {
  const { data } = await api.get(`/products/${id}/consumption-stats`);
  return data;
}

export async function lookupByBarcode(barcode: string): Promise<Product> {
  const { data } = await api.get(`/products/by-barcode/${encodeURIComponent(barcode)}`);
  return data;
}

export async function listProductBarcodes(productId: number): Promise<ProductBarcode[]> {
  const { data } = await api.get(`/products/${productId}/barcodes`);
  return data;
}

export async function addProductBarcode(productId: number, body: { barcode: string; barcode_type?: string; is_primary?: boolean }): Promise<ProductBarcode> {
  const { data } = await api.post(`/products/${productId}/barcodes`, body);
  return data;
}

export async function deleteProductBarcode(barcodeId: number): Promise<void> {
  await api.delete(`/products/barcodes/${barcodeId}`);
}

// --- Stock Reservations ---

export interface ReservationListParams {
  [key: string]: unknown;
  company_id: number;
  product_id?: number;
  status?: string;
  reference_type?: string;
  reference_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function listReservations(params: ReservationListParams): Promise<PaginatedResponse<StockReservation>> {
  const { data } = await api.get("/stock/reservations", { params });
  return data;
}

export async function createReservation(body: {
  product_id: number;
  location_id: number;
  lot_id?: number | null;
  quantity: number;
  reference_type: string;
  reference_id?: number | null;
  reference_label?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  company_id: number;
}): Promise<StockReservation> {
  const { data } = await api.post("/stock/reservations", body);
  return data;
}

export async function releaseReservation(id: number): Promise<void> {
  await api.delete(`/stock/reservations/${id}`);
}

export async function releaseByReference(referenceType: string, referenceId: number): Promise<{ released_count: number }> {
  const { data } = await api.post("/stock/reservations/release", { reference_type: referenceType, reference_id: referenceId });
  return data;
}

// --- Replenishment ---

export async function getReplenishmentSuggestions(companyId: number, params?: { category_id?: number; abc_classification?: string }): Promise<ReplenishmentSuggestion[]> {
  const { data } = await api.get("/stock/replenishment-suggestions", { params: { company_id: companyId, ...params } });
  return data;
}

export async function calculateReorderPoints(companyId: number): Promise<{ updated_count: number }> {
  const { data } = await api.post("/stock/calculate-reorder-points", null, { params: { company_id: companyId } });
  return data;
}

export async function calculateAbcClassification(companyId: number): Promise<{ classifications: Record<string, number> }> {
  const { data } = await api.post("/stock/calculate-abc-classification", null, { params: { company_id: companyId } });
  return data;
}

// --- Stock Transfers ---

export interface TransferListParams {
  [key: string]: unknown;
  company_id: number;
  status?: string;
  warehouse_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function listTransfers(params: TransferListParams): Promise<PaginatedResponse<StockTransfer>> {
  const { data } = await api.get("/stock-transfers", { params });
  return data;
}

export async function getTransfer(id: number): Promise<StockTransfer> {
  const { data } = await api.get(`/stock-transfers/${id}`);
  return data;
}

export async function createTransfer(body: {
  source_warehouse_id: number;
  destination_warehouse_id: number;
  transfer_date: string;
  expected_arrival_date?: string | null;
  notes?: string | null;
  company_id: number;
  lines: { product_id: number; lot_id?: number | null; quantity_sent: number }[];
}): Promise<StockTransfer> {
  const { data } = await api.post("/stock-transfers", body);
  return data;
}

export async function updateTransfer(id: number, body: {
  expected_arrival_date?: string | null;
  transporter?: string | null;
  tracking_number?: string | null;
  notes?: string | null;
}): Promise<StockTransfer> {
  const { data } = await api.patch(`/stock-transfers/${id}`, body);
  return data;
}

export async function validateTransfer(id: number): Promise<StockTransfer> {
  const { data } = await api.post(`/stock-transfers/${id}/validate`);
  return data;
}

export async function shipTransfer(id: number, body: { transporter?: string; tracking_number?: string }): Promise<StockTransfer> {
  const { data } = await api.post(`/stock-transfers/${id}/ship`, body);
  return data;
}

export async function receiveTransfer(id: number, body: { lines: { line_id: number; quantity_received: number }[] }): Promise<StockTransfer> {
  const { data } = await api.post(`/stock-transfers/${id}/receive`, body);
  return data;
}

export async function cancelTransfer(id: number): Promise<StockTransfer> {
  const { data } = await api.post(`/stock-transfers/${id}/cancel`);
  return data;
}

// --- Inventory Cycles ---

export interface CycleListParams {
  [key: string]: unknown;
  company_id: number;
  status?: string;
  warehouse_id?: number;
  frequency?: string;
  classification?: string;
  page?: number;
  page_size?: number;
}

export async function listCycles(params: CycleListParams): Promise<PaginatedResponse<InventoryCycle>> {
  const { data } = await api.get("/inventory-cycles", { params });
  return data;
}

export async function getCycle(id: number): Promise<InventoryCycle> {
  const { data } = await api.get(`/inventory-cycles/${id}`);
  return data;
}

export async function createCycle(body: {
  name: string;
  frequency: string;
  classification?: string | null;
  category_id?: number | null;
  warehouse_id: number;
  start_date: string;
  end_date: string;
  assigned_to_id?: number | null;
  company_id: number;
}): Promise<InventoryCycle> {
  const { data } = await api.post("/inventory-cycles", body);
  return data;
}

export async function generateCycles(body: {
  company_id: number;
  warehouse_id: number;
  period_start: string;
  period_end: string;
  assigned_to_id?: number | null;
}): Promise<InventoryCycle[]> {
  const { data } = await api.post("/inventory-cycles/generate", body);
  return data;
}

export async function startCycle(id: number): Promise<InventoryCycle> {
  const { data } = await api.post(`/inventory-cycles/${id}/start`);
  return data;
}

export async function completeCycle(id: number): Promise<InventoryCycle> {
  const { data } = await api.post(`/inventory-cycles/${id}/complete`);
  return data;
}

// --- Traceability ---

export async function getProductMovementHistory(productId: number, params?: {
  date_from?: string;
  date_to?: string;
  movement_type?: string;
  location_id?: number;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await api.get(`/stock/products/${productId}/movement-history`, { params });
  return data;
}

export async function getLotTraceability(lotId: number): Promise<{
  lot: { id: number; lot_number: string; manufacturing_date: string | null; expiry_date: string | null; best_before_date: string | null; notes: string | null };
  product: { id: number; sku: string; name: string } | null;
  supplier: { id: number; name: string; code: string } | null;
  movements: StockMovement[];
  current_locations: { location_id: number; location_name: string | null; quantity: number; reserved_quantity: number }[];
  total_in: number;
  total_out: number;
}> {
  const { data } = await api.get(`/stock/lots/${lotId}/traceability`);
  return data;
}

export async function getStockSnapshot(companyId: number, date: string): Promise<{ product_id: number; product_name: string; sku: string; quantity: number }[]> {
  const { data } = await api.get("/stock/snapshot", { params: { company_id: companyId, date } });
  return data;
}
