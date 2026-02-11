import api from "./api";
import type { PaginatedResponse } from "@/types/api";
import type {
  Product,
  ProductCategory,
  ProductStockSummary,
  Warehouse,
  StockLocation,
  Lot,
  StockMovement,
  Inventory,
  StockKPIs,
  StockAlert,
  StockValuationItem,
} from "@/types/stock";

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
