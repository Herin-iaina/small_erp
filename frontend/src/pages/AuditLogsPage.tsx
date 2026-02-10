import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { listAuditLogs, type AuditLogListParams } from "@/services/audit";
import type { AuditLog } from "@/types/audit";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 border-green-200",
  UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
  LOGIN: "bg-gray-100 text-gray-800 border-gray-200",
  TOGGLE_STATUS: "bg-orange-100 text-orange-800 border-orange-200",
};

const columns: Column<AuditLog>[] = [
  {
    key: "timestamp",
    label: "Date",
    render: (row) => formatDate(row.timestamp),
  },
  {
    key: "user_email",
    label: "Utilisateur",
  },
  {
    key: "action",
    label: "Action",
    render: (row) => (
      <Badge className={ACTION_COLORS[row.action] ?? ""}>
        {row.action}
      </Badge>
    ),
  },
  {
    key: "module",
    label: "Module",
  },
  {
    key: "entity_type",
    label: "Entite",
    render: (row) =>
      row.entity_type ? `${row.entity_type} #${row.entity_id}` : "-",
  },
  {
    key: "description",
    label: "Description",
    render: (row) => row.description || "-",
  },
];

export default function AuditLogsPage() {
  const { data, total, page, pages, loading, params, setParams, setPage } =
    useDataFetch<AuditLog, AuditLogListParams>({
      fetchFn: listAuditLogs,
      initialParams: { page: 1, page_size: 20 },
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Journal d'audit</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<AuditLog>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        emptyMessage="Aucun evenement"
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={params.action ?? "all"}
              onValueChange={(value) =>
                setParams({ action: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="LOGIN">LOGIN</SelectItem>
                <SelectItem value="TOGGLE_STATUS">TOGGLE_STATUS</SelectItem>
                <SelectItem value="RESET_PASSWORD">RESET_PASSWORD</SelectItem>
                <SelectItem value="SET_PIN">SET_PIN</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={params.module ?? "all"}
              onValueChange={(value) =>
                setParams({ module: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modules</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="pos">pos</SelectItem>
                <SelectItem value="stock">stock</SelectItem>
                <SelectItem value="sales">sales</SelectItem>
                <SelectItem value="purchase">purchase</SelectItem>
                <SelectItem value="invoicing">invoicing</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-[160px]"
              value={params.date_from ?? ""}
              onChange={(e) =>
                setParams({
                  date_from: e.target.value || undefined,
                })
              }
              placeholder="Date debut"
            />

            <Input
              type="date"
              className="w-[160px]"
              value={params.date_to ?? ""}
              onChange={(e) =>
                setParams({
                  date_to: e.target.value || undefined,
                })
              }
              placeholder="Date fin"
            />
          </div>
        }
      />
    </div>
  );
}
