import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { TransferFormDialog } from "@/components/stock/TransferFormDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listTransfers, type TransferListParams } from "@/services/stock";
import type { StockTransfer } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  validated: "bg-blue-100 text-blue-800",
  in_transit: "bg-yellow-100 text-yellow-800",
  received: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  validated: "Valide",
  in_transit: "En transit",
  received: "Recu",
  cancelled: "Annule",
};

const columns: Column<StockTransfer>[] = [
  { key: "reference", label: "Reference", className: "font-mono" },
  {
    key: "source_warehouse",
    label: "Source",
    render: (row) => row.source_warehouse ? `${row.source_warehouse.code} - ${row.source_warehouse.name}` : "-",
  },
  {
    key: "destination_warehouse",
    label: "Destination",
    render: (row) => row.destination_warehouse ? `${row.destination_warehouse.code} - ${row.destination_warehouse.name}` : "-",
  },
  {
    key: "status",
    label: "Statut",
    render: (row) => (
      <Badge variant="outline" className={statusColors[row.status] || ""}>
        {statusLabels[row.status] || row.status}
      </Badge>
    ),
  },
  {
    key: "transfer_date",
    label: "Date transfert",
    render: (row) => new Date(row.transfer_date).toLocaleDateString("fr-FR"),
  },
  {
    key: "transporter",
    label: "Transporteur",
    render: (row) => row.transporter || "-",
  },
  {
    key: "created_at",
    label: "Cree le",
    render: (row) => new Date(row.created_at).toLocaleDateString("fr-FR"),
  },
];

export default function TransfersPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<StockTransfer, TransferListParams>({
      fetchFn: listTransfers,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transferts inter-entrepots</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<StockTransfer>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par reference..."
        filters={
          <Select
            value={params.status ?? "all"}
            onValueChange={(v) => setParams({ status: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="validated">Valide</SelectItem>
              <SelectItem value="in_transit">En transit</SelectItem>
              <SelectItem value="received">Recu</SelectItem>
              <SelectItem value="cancelled">Annule</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Nouveau transfert
          </Button>
        }
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/transfers/${row.id}`)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      <TransferFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />
    </div>
  );
}
