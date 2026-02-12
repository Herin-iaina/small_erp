import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import UsersPage from "@/pages/UsersPage";
import CompaniesPage from "@/pages/CompaniesPage";
import RolesPage from "@/pages/RolesPage";
import AuditLogsPage from "@/pages/AuditLogsPage";
import StockDashboard from "@/pages/stock/StockDashboard";
import ProductsPage from "@/pages/stock/ProductsPage";
import WarehousesPage from "@/pages/stock/WarehousesPage";
import MovementsPage from "@/pages/stock/MovementsPage";
import LotsPage from "@/pages/stock/LotsPage";
import InventoriesPage from "@/pages/stock/InventoriesPage";
import InventoryDetailPage from "@/pages/stock/InventoryDetailPage";
import CategoriesPage from "@/pages/stock/CategoriesPage";
import NotFoundPage from "@/pages/NotFound";

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="users"
            element={
              <ProtectedRoute permission="admin.view">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="companies"
            element={
              <ProtectedRoute permission="admin.view">
                <CompaniesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="roles"
            element={
              <ProtectedRoute permission="admin.view">
                <RolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-logs"
            element={
              <ProtectedRoute permission="admin.view">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          {/* Stock module */}
          <Route
            path="stock"
            element={
              <ProtectedRoute permission="stock.view">
                <StockDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock/categories"
            element={
              <ProtectedRoute permission="stock.view">
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock/products"
            element={
              <ProtectedRoute permission="stock.view">
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock/warehouses"
            element={
              <ProtectedRoute permission="stock.view">
                <WarehousesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock/movements"
            element={
              <ProtectedRoute permission="stock.view">
                <MovementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock/lots"
            element={
              <ProtectedRoute permission="stock.view">
                <LotsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock/inventories"
            element={
              <ProtectedRoute permission="stock.view">
                <InventoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock/inventories/:id"
            element={
              <ProtectedRoute permission="stock.view">
                <InventoryDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
