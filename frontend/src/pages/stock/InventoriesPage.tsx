import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, CheckCircle, XCircle, Eye } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InventoryFormDialog } from "@/components/stock/InventoryFormDialog";
import { MovementStatusBadge } from "@/components/stock/MovementStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  listInventories,
  startInventory,
  validateInventory,
  cancelInventory,
  type InventoryListParams,
} from "@/services/stock";
import type { Inventory } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

const columns: Column<Inventory>[] = [
  { key: "reference", label: "Reference", className: "font-mono" },
  { key: "name", label: "Nom" },
  { key: "warehouse", label: "Entrepot", render: (i) => i.warehouse?.name || "-" },
  { key: "status", label: "Statut", render: (i) => <MovementStatusBadge status={i.status} /> },
  { key: "created_by", label: "Cree par", render: (i) => i.created_by ? `${i.created_by.first_name} ${i.created_by.last_name}` : "-" },
  { key: "created_at", label: "Date", render: (i) => new Date(i.created_at).toLocaleDateString("fr-FR") },
];

export default function InventoriesPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ inventory: Inventory; action: "start" | "validate" | "cancel" } | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<Inventory, InventoryListParams>({
      fetchFn: listInventories,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  const handleAction = (inventory: Inventory, action: "start" | "validate" | "cancel") => {
    setConfirmAction({ inventory, action });
    setConfirmOpen(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    try {
      const { inventory, action } = confirmAction;
      if (action === "start") {
        await startInventory(inventory.id);
        toast({ title: "Inventaire demarre" });
      } else if (action === "validate") {
        await validateInventory(inventory.id);
        toast({ title: "Inventaire valide" });
      } else {
        await cancelInventory(inventory.id);
        toast({ title: "Inventaire annule" });
      }
      refresh();
    } catch {
      toast({ title: "Erreur", description: "Action impossible", variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const getActionLabel = () => {
    if (!confirmAction) return "";
    switch (confirmAction.action) {
      case "start": return "Demarrer";
      case "validate": return "Valider";
      case "cancel": return "Annuler";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventaires</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<Inventory>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par reference ou nom..."
        rowKey={(i) => i.id}
        filters={
          <Select
            value={params.status ?? "all"}
            onValueChange={(v) => setParams({ status: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="validated">Valide</SelectItem>
              <SelectItem value="cancelled">Annule</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel inventaire
          </Button>
        }
        rowActions={(inventory) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/inventories/${inventory.id}`)} title="Detail">
              <Eye className="h-4 w-4" />
            </Button>
            {inventory.status === "draft" && (
              <>
                <Button variant="ghost" size="icon" onClick={() => handleAction(inventory, "start")} title="Demarrer">
                  <Play className="h-4 w-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleAction(inventory, "cancel")} title="Annuler">
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
            {inventory.status === "in_progress" && (
              <>
                <Button variant="ghost" size="icon" onClick={() => handleAction(inventory, "validate")} title="Valider">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleAction(inventory, "cancel")} title="Annuler">
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
          </div>
        )}
      />

      <InventoryFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${getActionLabel()} l'inventaire`}
        description={
          confirmAction
            ? `Voulez-vous ${getActionLabel().toLowerCase()} l'inventaire "${confirmAction.inventory.name}" ?`
            : ""
        }
        confirmLabel={getActionLabel()}
        variant={confirmAction?.action === "cancel" ? "destructive" : "default"}
        onConfirm={executeAction}
      />
    </div>
  );
}
