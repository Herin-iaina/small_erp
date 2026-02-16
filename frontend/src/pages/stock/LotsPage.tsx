import { useEffect, useState } from "react";
import { Plus, Pencil, History } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { LotFormDialog } from "@/components/stock/LotFormDialog";
import { LotTraceabilityDialog } from "@/components/stock/LotTraceabilityDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listLots, listProducts, type LotListParams } from "@/services/stock";
import type { Lot, Product } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">-</span>;
  const d = new Date(date);
  const now = new Date();
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return <Badge className="bg-red-600 text-white">Expire</Badge>;
  if (daysLeft <= 30) return <Badge className="bg-orange-500 text-white">{daysLeft}j</Badge>;
  return <span>{d.toLocaleDateString("fr-FR")}</span>;
}

export default function LotsPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [traceabilityLotId, setTraceabilityLotId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [expiryFilter, setExpiryFilter] = useState("all");

  useEffect(() => {
    if (!companyId) return;
    listProducts({ company_id: companyId, page_size: 200, is_active: true })
      .then((r) => setProducts(r.items))
      .catch(() => {});
  }, [companyId]);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<Lot, LotListParams>({
      fetchFn: listLots,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  const handleExpiryFilter = (value: string) => {
    setExpiryFilter(value);
    if (value === "all") {
      setParams({ is_expired: undefined, expiring_within_days: undefined });
    } else if (value === "expired") {
      setParams({ is_expired: true, expiring_within_days: undefined });
    } else {
      setParams({ is_expired: undefined, expiring_within_days: Number(value) });
    }
  };

  const columns: Column<Lot>[] = [
    { key: "lot_number", label: "N° Lot", className: "font-mono" },
    { key: "product", label: "Article", render: (l) => l.product ? `${l.product.sku} - ${l.product.name}` : "-" },
    {
      key: "total_quantity",
      label: "Qte totale",
      render: (l) => l.total_quantity != null ? Number(l.total_quantity).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "-",
      className: "text-right",
    },
    {
      key: "total_available",
      label: "Disponible",
      render: (l) => {
        if (l.total_available == null) return "-";
        const val = Number(l.total_available);
        return (
          <span className={val <= 0 ? "text-red-600 font-semibold" : ""}>
            {val.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
          </span>
        );
      },
      className: "text-right",
    },
    { key: "expiry_date", label: "DLC", render: (l) => <ExpiryBadge date={l.expiry_date} /> },
    { key: "best_before_date", label: "DLUO", render: (l) => l.best_before_date ? new Date(l.best_before_date).toLocaleDateString("fr-FR") : "-" },
    { key: "supplier", label: "Fournisseur", render: (l) => l.supplier?.name || "-" },
    { key: "created_at", label: "Cree le", render: (l) => new Date(l.created_at).toLocaleDateString("fr-FR") },
  ];

  const handleCreate = () => {
    setEditingLot(null);
    setFormOpen(true);
  };

  const handleEdit = (lot: Lot) => {
    setEditingLot(lot);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lots</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<Lot>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par numero de lot..."
        rowKey={(l) => l.id}
        filters={
          <div className="flex gap-2">
            <Select
              value={params.product_id ? String(params.product_id) : "all"}
              onValueChange={(v) => setParams({ product_id: v === "all" ? undefined : Number(v) })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Article" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les articles</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.sku} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={handleExpiryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes expirations</SelectItem>
                <SelectItem value="expired">Expires</SelectItem>
                <SelectItem value="7">Expire dans 7j</SelectItem>
                <SelectItem value="30">Expire dans 30j</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau lot
          </Button>
        }
        rowActions={(lot) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(lot)} title="Modifier">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTraceabilityLotId(lot.id)} title="Tracabilite">
              <History className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <LotFormDialog open={formOpen} onOpenChange={setFormOpen} lot={editingLot} onSuccess={refresh} />

      <LotTraceabilityDialog
        lotId={traceabilityLotId}
        open={traceabilityLotId !== null}
        onOpenChange={(open) => { if (!open) setTraceabilityLotId(null); }}
      />
    </div>
  );
}
