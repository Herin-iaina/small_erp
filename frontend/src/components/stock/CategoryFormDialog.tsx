import { useEffect, useState } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { createCategory, updateCategory, listCategories } from "@/services/stock";
import type { ProductCategory } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ProductCategory | null;
  onSuccess: () => void;
}

interface Form {
  name: string;
  code: string;
  description: string;
  parent_id: number | null;
}

const defaultForm: Form = { name: "", code: "", description: "", parent_id: null };

export function CategoryFormDialog({ open, onOpenChange, category, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (open && companyId) {
      listCategories({ company_id: companyId, page_size: 100, is_active: true })
        .then((res) => setAllCategories(res.items))
        .catch(() => setAllCategories([]));
      setForm(
        category
          ? { name: category.name, code: category.code, description: category.description ?? "", parent_id: category.parent_id }
          : defaultForm
      );
    }
  }, [open, category, companyId]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        description: form.description || null,
        parent_id: form.parent_id,
      };
      if (category) {
        await updateCategory(category.id, payload);
      } else {
        await createCategory({ ...payload, company_id: companyId! });
      }
      toast({ title: "Categorie enregistree" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Modifier la categorie" : "Nouvelle categorie"}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Code *</Label>
            <Input value={form.code} onChange={(e) => updateField("code", e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Categorie parente</Label>
          <Select
            value={form.parent_id?.toString() ?? "none"}
            onValueChange={(v) => updateField("parent_id", v === "none" ? null : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Aucune (racine)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune (racine)</SelectItem>
              {allCategories
                .filter((c) => !category || c.id !== category.id)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} />
        </div>
      </div>
    </FormDialog>
  );
}
