import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { LotFormDialog } from "@/components/stock/LotFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listLots, type LotListParams } from "@/services/stock";
import type { Lot } from "@/types/stock";
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

const columns: Column<Lot>[] = [
  { key: "lot_number", label: "N° Lot", className: "font-mono" },
  { key: "product", label: "Article", render: (l) => l.product ? `${l.product.sku} - ${l.product.name}` : "-" },
  { key: "expiry_date", label: "DLC", render: (l) => <ExpiryBadge date={l.expiry_date} /> },
  { key: "best_before_date", label: "DLUO", render: (l) => l.best_before_date ? new Date(l.best_before_date).toLocaleDateString("fr-FR") : "-" },
  { key: "supplier", label: "Fournisseur", render: (l) => l.supplier?.name || "-" },
  { key: "created_at", label: "Cree le", render: (l) => new Date(l.created_at).toLocaleDateString("fr-FR") },
];

export default function LotsPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<Lot, LotListParams>({
      fetchFn: listLots,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

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
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau lot
          </Button>
        }
        rowActions={(lot) => (
          <Button variant="ghost" size="icon" onClick={() => handleEdit(lot)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      />

      <LotFormDialog open={formOpen} onOpenChange={setFormOpen} lot={editingLot} onSuccess={refresh} />
    </div>
  );
}
