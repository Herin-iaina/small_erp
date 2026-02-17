import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/FormDialog";
import { toast } from "@/hooks/use-toast";
import { createCycle, listWarehouses, type WarehouseListParams } from "@/services/stock";
import type { Warehouse } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Form {
  name: string;
  frequency: string;
  classification: string;
  warehouse_id: string;
  start_date: string;
  end_date: string;
}

const defaultForm: Form = {
  name: "",
  frequency: "monthly",
  classification: "all",
  warehouse_id: "",
  start_date: "",
  end_date: "",
};

export function CycleFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (!open || !companyId) return;
    setForm(defaultForm);
    listWarehouses({ company_id: companyId, is_active: true, page_size: 200 } as WarehouseListParams)
      .then((r) => setWarehouses(r.items))
      .catch(() => {});
  }, [open, companyId]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.warehouse_id || !form.start_date || !form.end_date) return;
    setLoading(true);
    try {
      await createCycle({
        name: form.name,
        frequency: form.frequency,
        classification: form.classification === "all" ? null : form.classification,
        warehouse_id: Number(form.warehouse_id),
        start_date: form.start_date,
        end_date: form.end_date,
        company_id: companyId!,
      });
      toast({ title: "Cycle cree" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de creer le cycle", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau cycle d'inventaire"
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required placeholder="Cycle A - Janvier 2026" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Frequence *</Label>
            <Select value={form.frequency} onValueChange={(v) => updateField("frequency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="quarterly">Trimestriel</SelectItem>
                <SelectItem value="yearly">Annuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Classification ABC</Label>
            <Select value={form.classification} onValueChange={(v) => updateField("classification", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Entrepot *</Label>
          <Select value={form.warehouse_id} onValueChange={(v) => updateField("warehouse_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>{w.code} - {w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date debut *</Label>
            <Input type="date" value={form.start_date} onChange={(e) => updateField("start_date", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Date fin *</Label>
            <Input type="date" value={form.end_date} onChange={(e) => updateField("end_date", e.target.value)} required />
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
