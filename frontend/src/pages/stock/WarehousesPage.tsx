import { useState } from "react";
import { Plus, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WarehouseFormDialog } from "@/components/stock/WarehouseFormDialog";
import { LocationsTable } from "@/components/stock/LocationsTable";
import { Button } from "@/components/ui/button";
import { listWarehouses, type WarehouseListParams } from "@/services/stock";
import type { Warehouse } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

const columns: Column<Warehouse>[] = [
  { key: "code", label: "Code", className: "font-mono" },
  { key: "name", label: "Nom" },
  { key: "address", label: "Adresse", render: (w) => w.address || "-" },
  { key: "is_active", label: "Statut", render: (w) => <StatusBadge active={w.is_active} /> },
];

export default function WarehousesPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<Warehouse, WarehouseListParams>({
      fetchFn: listWarehouses,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  const handleCreate = () => {
    setEditingWarehouse(null);
    setFormOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Entrepots</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<Warehouse>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par nom ou code..."
        rowKey={(w) => w.id}
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel entrepot
          </Button>
        }
        rowActions={(warehouse) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => toggleExpand(warehouse.id)}>
              {expandedId === warehouse.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(warehouse)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {expandedId && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">
            Emplacements - {data.find((w) => w.id === expandedId)?.name}
          </h3>
          <LocationsTable warehouseId={expandedId} />
        </div>
      )}

      <WarehouseFormDialog open={formOpen} onOpenChange={setFormOpen} warehouse={editingWarehouse} onSuccess={refresh} />
    </div>
  );
}
