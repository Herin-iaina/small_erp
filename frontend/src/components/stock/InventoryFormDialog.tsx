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
import { createInventory, listWarehouses } from "@/services/stock";
import type { Warehouse } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Form {
  name: string;
  warehouse_id: string;
  notes: string;
}

const defaultForm: Form = { name: "", warehouse_id: "", notes: "" };

export function InventoryFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (!open || !companyId) return;
    setForm(defaultForm);
    listWarehouses({ company_id: companyId, page_size: 100, is_active: true })
      .then((r) => setWarehouses(r.items))
      .catch(() => {});
  }, [open, companyId]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createInventory({
        name: form.name,
        warehouse_id: Number(form.warehouse_id),
        notes: form.notes || undefined,
        company_id: companyId!,
      });
      toast({ title: "Inventaire cree" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de creer l'inventaire", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvel inventaire"
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Entrepot *</Label>
          <Select value={form.warehouse_id} onValueChange={(v) => updateField("warehouse_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selectionner un entrepot" /></SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.code} - {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} />
        </div>
      </div>
    </FormDialog>
  );
}
