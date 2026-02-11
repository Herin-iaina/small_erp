import { useState } from "react";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MovementFormDialog } from "@/components/stock/MovementFormDialog";
import { MovementTypeBadge } from "@/components/stock/MovementTypeBadge";
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
import { listMovements, validateMovement, cancelMovement, type MovementListParams } from "@/services/stock";
import type { StockMovement } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

const columns: Column<StockMovement>[] = [
  { key: "reference", label: "Reference", className: "font-mono" },
  { key: "movement_type", label: "Type", render: (m) => <MovementTypeBadge type={m.movement_type} /> },
  { key: "product", label: "Article", render: (m) => m.product ? `${m.product.sku} - ${m.product.name}` : "-" },
  { key: "quantity", label: "Qte", render: (m) => Number(m.quantity).toFixed(1), className: "text-right" },
  { key: "source", label: "Source", render: (m) => m.source_location?.code || "-" },
  { key: "dest", label: "Destination", render: (m) => m.destination_location?.code || "-" },
  { key: "status", label: "Statut", render: (m) => <MovementStatusBadge status={m.status} /> },
  { key: "created_at", label: "Date", render: (m) => new Date(m.created_at).toLocaleDateString("fr-FR") },
];

export default function MovementsPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ movement: StockMovement; action: "validate" | "cancel" } | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<StockMovement, MovementListParams>({
      fetchFn: listMovements,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  const handleConfirm = (movement: StockMovement, action: "validate" | "cancel") => {
    setConfirmAction({ movement, action });
    setConfirmOpen(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.action === "validate") {
        await validateMovement(confirmAction.movement.id);
        toast({ title: "Mouvement valide" });
      } else {
        await cancelMovement(confirmAction.movement.id);
        toast({ title: "Mouvement annule" });
      }
      refresh();
    } catch {
      toast({ title: "Erreur", description: "Action impossible", variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mouvements de stock</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<StockMovement>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par reference..."
        rowKey={(m) => m.id}
        filters={
          <div className="flex gap-2">
            <Select
              value={params.movement_type ?? "all"}
              onValueChange={(v) => setParams({ movement_type: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="in">Entree</SelectItem>
                <SelectItem value="out">Sortie</SelectItem>
                <SelectItem value="transfer">Transfert</SelectItem>
                <SelectItem value="adjustment">Ajustement</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={params.status ?? "all"}
              onValueChange={(v) => setParams({ status: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="validated">Valide</SelectItem>
                <SelectItem value="cancelled">Annule</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau mouvement
          </Button>
        }
        rowActions={(movement) => (
          <div className="flex items-center gap-1">
            {movement.status === "draft" && (
              <>
                <Button variant="ghost" size="icon" onClick={() => handleConfirm(movement, "validate")} title="Valider">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleConfirm(movement, "cancel")} title="Annuler">
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
            {movement.status === "validated" && (
              <Button variant="ghost" size="icon" onClick={() => handleConfirm(movement, "cancel")} title="Annuler">
                <XCircle className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        )}
      />

      <MovementFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction?.action === "validate" ? "Valider le mouvement" : "Annuler le mouvement"}
        description={
          confirmAction
            ? confirmAction.action === "validate"
              ? `Valider le mouvement ${confirmAction.movement.reference} ? Le stock sera mis a jour.`
              : `Annuler le mouvement ${confirmAction.movement.reference} ?${confirmAction.movement.status === "validated" ? " Les changements de stock seront reverses." : ""}`
            : ""
        }
        confirmLabel={confirmAction?.action === "validate" ? "Valider" : "Annuler"}
        variant={confirmAction?.action === "cancel" ? "destructive" : "default"}
        onConfirm={executeAction}
      />
    </div>
  );
}
