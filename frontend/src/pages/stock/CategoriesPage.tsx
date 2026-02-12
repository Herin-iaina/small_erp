import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CategoryFormDialog } from "@/components/stock/CategoryFormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { listCategories, deleteCategory, type CategoryListParams } from "@/services/stock";
import type { ProductCategory } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

function makeColumns(allData: ProductCategory[]): Column<ProductCategory>[] {
  const parentMap = new Map(allData.map((c) => [c.id, c]));
  return [
    { key: "code", label: "Code", className: "font-mono" },
    { key: "name", label: "Nom" },
    {
      key: "parent_id",
      label: "Parent",
      render: (c) => {
        if (!c.parent_id) return <span className="text-muted-foreground">-</span>;
        const parent = parentMap.get(c.parent_id);
        return parent ? parent.name : <span className="text-muted-foreground">#{c.parent_id}</span>;
      },
    },
    { key: "description", label: "Description", render: (c) => c.description || "-" },
    { key: "is_active", label: "Statut", render: (c) => <StatusBadge active={c.is_active} /> },
  ];
}

export default function CategoriesPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);

  const { data, total, page, pages, loading, params, setParams, setPage, refresh } =
    useDataFetch<ProductCategory, CategoryListParams>({
      fetchFn: listCategories,
      initialParams: { company_id: companyId!, page: 1, page_size: 20 },
    });

  const handleCreate = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleDeleteConfirm = (category: ProductCategory) => {
    setDeletingCategory(category);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory(deletingCategory.id);
      toast({ title: "Categorie supprimee" });
      refresh();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer (des articles y sont rattaches ?)", variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setDeletingCategory(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categories</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <DataTable<ProductCategory>
        columns={makeColumns(data)}
        data={data}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(value) => setParams({ search: value || undefined })}
        searchPlaceholder="Rechercher par nom ou code..."
        rowKey={(c) => c.id}
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle categorie
          </Button>
        }
        rowActions={(category) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirm(category)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editingCategory} onSuccess={refresh} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer la categorie"
        description={deletingCategory ? `Supprimer "${deletingCategory.name}" ? Les articles rattaches ne seront pas supprimes.` : ""}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
