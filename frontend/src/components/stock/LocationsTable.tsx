import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LocationFormDialog } from "./LocationFormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { listLocations, deleteLocation, type LocationListParams } from "@/services/stock";
import type { StockLocation } from "@/types/stock";

const columns: Column<StockLocation>[] = [
  { key: "code", label: "Code" },
  { key: "name", label: "Nom" },
  { key: "aisle", label: "Allee", render: (l) => l.aisle || "-" },
  { key: "shelf", label: "Etagere", render: (l) => l.shelf || "-" },
  { key: "bin", label: "Casier", render: (l) => l.bin || "-" },
  { key: "location_type", label: "Type" },
];

interface Props {
  warehouseId: number;
}

export function LocationsTable({ warehouseId }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<StockLocation | null>(null);

  const { data, total, page, pages, loading, setPage, refresh } =
    useDataFetch<StockLocation, LocationListParams>({
      fetchFn: (params) => listLocations(warehouseId, params),
      initialParams: { page: 1, page_size: 20 },
    });

  const handleCreate = () => {
    setEditingLocation(null);
    setFormOpen(true);
  };

  const handleEdit = (location: StockLocation) => {
    setEditingLocation(location);
    setFormOpen(true);
  };

  const handleDeleteConfirm = (location: StockLocation) => {
    setDeletingLocation(location);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;
    try {
      await deleteLocation(deletingLocation.id);
      toast({ title: "Emplacement supprime" });
      refresh();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setDeletingLocation(null);
    }
  };

  return (
    <div className="mt-4">
      <DataTable<StockLocation>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        rowKey={(l) => l.id}
        actions={
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Emplacement
          </Button>
        }
        rowActions={(location) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirm(location)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <LocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouseId={warehouseId}
        location={editingLocation}
        onSuccess={refresh}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer l'emplacement"
        description={deletingLocation ? `Supprimer "${deletingLocation.name}" ?` : ""}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
