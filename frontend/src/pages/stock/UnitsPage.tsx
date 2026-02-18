import { useState } from "react";
import { Plus, Pencil, Sparkles } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { UnitFormDialog } from "@/components/stock/UnitFormDialog";
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
import { listUnits, seedUnits, type UnitListParams } from "@/services/stock";
import type { UnitOfMeasure } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

const categoryLabels: Record<string, string> = {
  unit: "Unite",
  weight: "Poids",
  volume: "Volume",
  length: "Longueur",
  surface: "Surface",
  time: "Temps",
};

const columns: Column<UnitOfMeasure>[] = [
  { key: "symbol", label: "Symbole", className: "font-mono font-semibold" },
  { key: "name", label: "Nom" },
  {
    key: "category",
    label: "Categorie",
    render: (row) => (
      <Badge variant="outline">{categoryLabels[row.category] || row.category}</Badge>
    ),
  },
  {
    key: "base_unit",
    label: "Unite de base",
    render: (row) => row.base_unit ? row.base_unit.symbol : <span className="text-muted-foreground">-</span>,
  },
  {
    key: "conversion_factor",
    label: "Facteur",
    render: (row) => Number(row.conversion_factor).toString(),
    className: "text-right",
  },
  {
    key: "is_active",
    label: "Actif",
    render: (row) => (
      <Badge variant={row.is_active ? "default" : "secondary"}>
        {row.is_active ? "Oui" : "Non"}
      </Badge>
    ),
  },
];

export default function UnitsPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<UnitOfMeasure | null>(null);
  const [seeding, setSeeding] = useState(false);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<UnitOfMeasure, UnitListParams>({
      fetchFn: listUnits,
      initialParams: { company_id: companyId!, page: 1, page_size: 50 },
    });

  const handleEdit = (unit: UnitOfMeasure) => {
    setEditUnit(unit);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditUnit(null);
    setFormOpen(true);
  };

  const handleSeed = async () => {
    if (!companyId) return;
    setSeeding(true);
    try {
      const created = await seedUnits(companyId);
      toast({ title: `${created.length} unites creees` });
      refresh();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Unites de mesure</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<UnitOfMeasure>
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
        searchPlaceholder="Rechercher par nom ou symbole..."
        filters={
          <Select
            value={params.category ?? "all"}
            onValueChange={(v) => setParams({ category: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="unit">Unite</SelectItem>
              <SelectItem value="weight">Poids</SelectItem>
              <SelectItem value="volume">Volume</SelectItem>
              <SelectItem value="length">Longueur</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
              <SelectItem value="time">Temps</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              <Sparkles className="mr-2 h-4 w-4" />{seeding ? "..." : "Seed defaults"}
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />Nouvelle unite
            </Button>
          </div>
        }
        rowActions={(row) => (
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      />

      <UnitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        unit={editUnit}
        onSuccess={refresh}
      />
    </div>
  );
}
