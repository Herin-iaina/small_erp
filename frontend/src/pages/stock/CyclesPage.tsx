import { useState } from "react";
import { Plus, Zap, Play, CheckCircle } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CycleFormDialog } from "@/components/stock/CycleFormDialog";
import { CycleGenerateDialog } from "@/components/stock/CycleGenerateDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { listCycles, startCycle, completeCycle, type CycleListParams } from "@/services/stock";
import type { InventoryCycle } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

const statusColors: Record<string, string> = {
  planned: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  planned: "Planifie",
  in_progress: "En cours",
  completed: "Termine",
};

const frequencyLabels: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

const columns: Column<InventoryCycle>[] = [
  { key: "name", label: "Nom" },
  {
    key: "frequency",
    label: "Frequence",
    render: (row) => frequencyLabels[row.frequency] || row.frequency,
  },
  {
    key: "classification",
    label: "Classe",
    render: (row) => row.classification ? (
      <Badge variant="outline">{row.classification}</Badge>
    ) : "-",
  },
  {
    key: "warehouse",
    label: "Entrepot",
    render: (row) => row.warehouse ? `${row.warehouse.code}` : "-",
  },
  {
    key: "start_date",
    label: "Debut",
    render: (row) => new Date(row.start_date).toLocaleDateString("fr-FR"),
  },
  {
    key: "end_date",
    label: "Fin",
    render: (row) => new Date(row.end_date).toLocaleDateString("fr-FR"),
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
    key: "assigned_to",
    label: "Assigne a",
    render: (row) => row.assigned_to ? `${row.assigned_to.first_name} ${row.assigned_to.last_name}` : "-",
  },
];

export default function CyclesPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ cycle: InventoryCycle; action: "start" | "complete" } | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<InventoryCycle, CycleListParams>({
      fetchFn: listCycles,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  const handleAction = (cycle: InventoryCycle, action: "start" | "complete") => {
    setConfirmAction({ cycle, action });
    setConfirmOpen(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.action === "start") {
        await startCycle(confirmAction.cycle.id);
        toast({ title: "Cycle demarre, inventaire cree" });
      } else {
        await completeCycle(confirmAction.cycle.id);
        toast({ title: "Cycle termine" });
      }
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cycles d'inventaire</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<InventoryCycle>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        searchValue={params.status ?? "all"}
        filters={
          <>
            <Select
              value={params.status ?? "all"}
              onValueChange={(v) => setParams({ status: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="planned">Planifie</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="completed">Termine</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={params.frequency ?? "all"}
              onValueChange={(v) => setParams({ frequency: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Frequence" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="quarterly">Trimestriel</SelectItem>
                <SelectItem value="yearly">Annuel</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              <Zap className="mr-2 h-4 w-4" />Generer
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Nouveau cycle
            </Button>
          </div>
        }
        rowActions={(row) => (
          <div className="flex items-center gap-1">
            {row.status === "planned" && (
              <Button variant="ghost" size="icon" title="Demarrer" onClick={() => handleAction(row, "start")}>
                <Play className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {row.status === "in_progress" && (
              <Button variant="ghost" size="icon" title="Terminer" onClick={() => handleAction(row, "complete")}>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
            )}
          </div>
        )}
      />

      <CycleFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={refresh} />
      <CycleGenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} onSuccess={refresh} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction?.action === "start" ? "Demarrer le cycle ?" : "Terminer le cycle ?"}
        description={
          confirmAction?.action === "start"
            ? `Un inventaire filtre sera automatiquement cree pour "${confirmAction.cycle.name}".`
            : `Le cycle "${confirmAction?.cycle.name}" sera marque comme termine.`
        }
        confirmLabel={confirmAction?.action === "start" ? "Demarrer" : "Terminer"}
        onConfirm={executeAction}
      />
    </div>
  );
}
