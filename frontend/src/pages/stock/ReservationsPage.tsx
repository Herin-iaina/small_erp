import { useState } from "react";
import { Plus, Unlock } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ReservationFormDialog } from "@/components/stock/ReservationFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { listReservations, releaseReservation, type ReservationListParams } from "@/services/stock";
import type { StockReservation } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  released: "secondary",
  expired: "destructive",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  released: "Liberee",
  expired: "Expiree",
};

const columns: Column<StockReservation>[] = [
  { key: "reference_type", label: "Type ref.", render: (r) => r.reference_type || "-" },
  { key: "reference_label", label: "Label ref.", render: (r) => r.reference_label || "-" },
  { key: "product", label: "Article", render: (r) => r.product?.name || "-" },
  { key: "location", label: "Emplacement", render: (r) => r.location?.name || "-" },
  { key: "quantity", label: "Qte", render: (r) => Number(r.quantity).toFixed(1), className: "text-right" },
  {
    key: "status",
    label: "Statut",
    render: (r) => (
      <Badge variant={statusVariant[r.status] ?? "secondary"}>
        {statusLabel[r.status] ?? r.status}
      </Badge>
    ),
  },
  {
    key: "reserved_date",
    label: "Date reservation",
    render: (r) => r.reserved_date ? new Date(r.reserved_date).toLocaleDateString("fr-FR") : "-",
  },
  {
    key: "expiry_date",
    label: "Expiration",
    render: (r) => r.expiry_date ? new Date(r.expiry_date).toLocaleDateString("fr-FR") : "-",
  },
];

export default function ReservationsPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<StockReservation | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<StockReservation, ReservationListParams>({
      fetchFn: listReservations,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  const handleRelease = (reservation: StockReservation) => {
    setReleaseTarget(reservation);
    setConfirmOpen(true);
  };

  const executeRelease = async () => {
    if (!releaseTarget) return;
    try {
      await releaseReservation(releaseTarget.id);
      toast({ title: "Reservation liberee" });
      refresh();
    } catch {
      toast({ title: "Erreur", description: "Impossible de liberer la reservation", variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setReleaseTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reservations de stock</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<StockReservation>
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
        rowKey={(r) => r.id}
        filters={
          <Select
            value={params.status ?? "all"}
            onValueChange={(v) => setParams({ status: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="released">Liberee</SelectItem>
              <SelectItem value="expired">Expiree</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle reservation
          </Button>
        }
        rowActions={(reservation) => (
          <div className="flex items-center gap-1">
            {reservation.status === "active" && (
              <Button variant="ghost" size="icon" onClick={() => handleRelease(reservation)} title="Liberer">
                <Unlock className="h-4 w-4 text-orange-600" />
              </Button>
            )}
          </div>
        )}
      />

      <ReservationFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Liberer la reservation"
        description={
          releaseTarget
            ? `Voulez-vous liberer la reservation pour "${releaseTarget.product?.name ?? "cet article"}" (${Number(releaseTarget.quantity).toFixed(1)} unites) ?`
            : ""
        }
        confirmLabel="Liberer"
        variant="destructive"
        onConfirm={executeRelease}
      />
    </div>
  );
}
