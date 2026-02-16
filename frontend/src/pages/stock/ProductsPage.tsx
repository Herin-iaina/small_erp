import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Power, Eye, SlidersHorizontal } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ProductFormDialog } from "@/components/stock/ProductFormDialog";
import { MovementFormDialog } from "@/components/stock/MovementFormDialog";
import { CategorySelect } from "@/components/stock/CategorySelect";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { listProducts, toggleProductStatus, getProductStockTotals, type ProductListParams } from "@/services/stock";
import type { Product } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";
import { useCurrency } from "@/hooks/useCurrency";

export default function ProductsPage() {
  const navigate = useNavigate();
  const companyId = useAuthStore((s) => s.user?.company_id);
  const { formatCurrency } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [togglingProduct, setTogglingProduct] = useState<Product | null>(null);
  const [stockTotals, setStockTotals] = useState<Record<string, number>>({});
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustingProductId, setAdjustingProductId] = useState<number | undefined>();

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<Product, ProductListParams>({
      fetchFn: listProducts,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  // Load stock totals whenever data changes
  useEffect(() => {
    if (!companyId) return;
    getProductStockTotals(companyId)
      .then(setStockTotals)
      .catch(() => {});
  }, [companyId, data]);

  const columns: Column<Product>[] = [
    { key: "sku", label: "SKU", className: "font-mono" },
    { key: "name", label: "Nom" },
    { key: "category", label: "Categorie", render: (p) => p.category?.name || "-" },
    { key: "product_type", label: "Type" },
    {
      key: "stock",
      label: "Stock",
      render: (p) => {
        if (p.product_type !== "stockable") return <span className="text-muted-foreground">-</span>;
        const qty = stockTotals[String(p.id)] ?? 0;
        const isLow = p.reorder_point > 0 && qty <= p.reorder_point;
        const isOut = qty <= 0;
        return (
          <span className={`font-semibold ${isOut ? "text-red-600" : isLow ? "text-orange-500" : ""}`}>
            {qty.toFixed(1)}
          </span>
        );
      },
      className: "text-right",
    },
    { key: "sale_price", label: "Prix vente", render: (p) => formatCurrency(p.sale_price), className: "text-right" },
    { key: "cost_price", label: "Prix revient", render: (p) => formatCurrency(p.cost_price), className: "text-right" },
    { key: "is_active", label: "Statut", render: (p) => <StatusBadge active={p.is_active} /> },
  ];

  const handleCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleToggleConfirm = (product: Product) => {
    setTogglingProduct(product);
    setConfirmOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!togglingProduct) return;
    try {
      await toggleProductStatus(togglingProduct.id);
      toast({ title: togglingProduct.is_active ? "Article desactive" : "Article active" });
      refresh();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setTogglingProduct(null);
    }
  };

  const handleAdjust = (product: Product) => {
    setAdjustingProductId(product.id);
    setAdjustmentOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Articles</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<Product>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par nom, SKU, code-barres..."
        rowKey={(p) => p.id}
        filters={
          <div className="flex gap-2">
            <div className="w-[180px]">
              <CategorySelect
                companyId={companyId!}
                value={params.category_id ?? null}
                onChange={(v) => setParams({ category_id: v ?? undefined })}
              />
            </div>
            <Select
              value={params.product_type ?? "all"}
              onValueChange={(v) => setParams({ product_type: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="stockable">Stockable</SelectItem>
                <SelectItem value="consumable">Consommable</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel article
          </Button>
        }
        rowActions={(product) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/products/${product.id}`)} title="Voir le detail">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} title="Modifier">
              <Pencil className="h-4 w-4" />
            </Button>
            {product.product_type === "stockable" && (
              <Button variant="ghost" size="icon" onClick={() => handleAdjust(product)} title="Ajuster le stock">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => handleToggleConfirm(product)} title="Activer/Desactiver">
              <Power className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} onSuccess={refresh} />

      <MovementFormDialog
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        onSuccess={refresh}
        defaultMovementType="adjustment"
        defaultProductId={adjustingProductId}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Modifier le statut"
        description={togglingProduct ? `Voulez-vous ${togglingProduct.is_active ? "desactiver" : "activer"} l'article "${togglingProduct.name}" ?` : ""}
        confirmLabel="Confirmer"
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
