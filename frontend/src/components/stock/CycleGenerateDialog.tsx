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
import { generateCycles, listWarehouses, type WarehouseListParams } from "@/services/stock";
import type { Warehouse } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Form {
  warehouse_id: string;
  period_start: string;
  period_end: string;
}

const defaultForm: Form = {
  warehouse_id: "",
  period_start: "",
  period_end: "",
};

export function CycleGenerateDialog({ open, onOpenChange, onSuccess }: Props) {
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
    if (!form.warehouse_id || !form.period_start || !form.period_end) return;
    setLoading(true);
    try {
      const cycles = await generateCycles({
        company_id: companyId!,
        warehouse_id: Number(form.warehouse_id),
        period_start: form.period_start,
        period_end: form.period_end,
      });
      toast({ title: `${cycles.length} cycles generes` });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de generer les cycles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generer des cycles automatiquement"
      description="Genere des cycles d'inventaire pour les classifications A (mensuel), B (trimestriel) et C (annuel)"
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel="Generer"
    >
      <div className="grid gap-4">
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
            <Label>Debut de periode *</Label>
            <Input type="date" value={form.period_start} onChange={(e) => updateField("period_start", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Fin de periode *</Label>
            <Input type="date" value={form.period_end} onChange={(e) => updateField("period_end", e.target.value)} required />
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
