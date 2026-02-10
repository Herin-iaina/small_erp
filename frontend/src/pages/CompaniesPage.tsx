import { useState } from "react";
import { Plus, Pencil, Power } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CompanyFormDialog } from "@/components/companies/CompanyFormDialog";
import { toast } from "@/hooks/use-toast";
import { listCompanies, toggleCompanyStatus, type CompanyListParams } from "@/services/companies";
import type { Company } from "@/types/company";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const columns: Column<Company>[] = [
  { key: "name", label: "Nom" },
  { key: "legal_name", label: "Raison sociale", render: (c) => c.legal_name || "-" },
  { key: "tax_id", label: "SIRET", render: (c) => c.tax_id || "-" },
  { key: "city", label: "Ville", render: (c) => c.city || "-" },
  { key: "currency", label: "Devise" },
  { key: "is_active", label: "Statut", render: (c) => <StatusBadge active={c.is_active} /> },
];

export default function CompaniesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [togglingCompany, setTogglingCompany] = useState<Company | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<Company, CompanyListParams>({
      fetchFn: listCompanies,
      initialParams: { page: 1, page_size: 20 },
    });

  const handleCreate = () => {
    setEditingCompany(null);
    setFormOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleToggleConfirm = (company: Company) => {
    setTogglingCompany(company);
    setConfirmOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!togglingCompany) return;
    try {
      await toggleCompanyStatus(togglingCompany.id);
      toast({
        title: togglingCompany.is_active ? "Societe desactivee" : "Societe activee",
      });
      refresh();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
      setTogglingCompany(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Societes</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<Company>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par nom..."
        rowKey={(c) => c.id}
        filters={
          <Select
            value={
              params.is_active === undefined
                ? "all"
                : params.is_active
                  ? "active"
                  : "inactive"
            }
            onValueChange={(value) => {
              if (value === "all") {
                setParams({ is_active: undefined });
              } else if (value === "active") {
                setParams({ is_active: true });
              } else {
                setParams({ is_active: false });
              }
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle societe
          </Button>
        }
        rowActions={(company) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(company)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleToggleConfirm(company)}>
              <Power className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editingCompany}
        onSuccess={refresh}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Modifier le statut"
        description={
          togglingCompany
            ? `Voulez-vous ${togglingCompany.is_active ? "desactiver" : "activer"} la societe "${togglingCompany.name}" ?`
            : ""
        }
        confirmLabel="Confirmer"
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
