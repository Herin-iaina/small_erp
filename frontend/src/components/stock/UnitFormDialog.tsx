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
import { createUnit, updateUnit, listUnits, type UnitListParams } from "@/services/stock";
import type { UnitOfMeasure } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UnitOfMeasure | null;
  onSuccess: () => void;
}

interface Form {
  name: string;
  symbol: string;
  category: string;
  base_unit_id: string;
  conversion_factor: number;
}

const defaultForm: Form = {
  name: "",
  symbol: "",
  category: "unit",
  base_unit_id: "",
  conversion_factor: 1,
};

const CATEGORIES = [
  { value: "unit", label: "Unite" },
  { value: "weight", label: "Poids" },
  { value: "volume", label: "Volume" },
  { value: "length", label: "Longueur" },
  { value: "surface", label: "Surface" },
  { value: "time", label: "Temps" },
];

export function UnitFormDialog({ open, onOpenChange, unit, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [baseUnits, setBaseUnits] = useState<UnitOfMeasure[]>([]);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (!open || !companyId) return;
    if (unit) {
      setForm({
        name: unit.name,
        symbol: unit.symbol,
        category: unit.category,
        base_unit_id: unit.base_unit_id?.toString() || "",
        conversion_factor: Number(unit.conversion_factor),
      });
    } else {
      setForm(defaultForm);
    }
    listUnits({ company_id: companyId, is_active: true, page_size: 200 } as UnitListParams)
      .then((r) => setBaseUnits(r.items))
      .catch(() => {});
  }, [open, companyId, unit]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filteredBaseUnits = baseUnits.filter(
    (u) => u.category === form.category && (!unit || u.id !== unit.id)
  );

  const handleSubmit = async () => {
    if (!form.name || !form.symbol || !form.category) return;
    setLoading(true);
    try {
      if (unit) {
        await updateUnit(unit.id, {
          name: form.name,
          symbol: form.symbol,
          category: form.category,
          base_unit_id: form.base_unit_id ? Number(form.base_unit_id) : null,
          conversion_factor: form.conversion_factor,
        });
        toast({ title: "Unite modifiee" });
      } else {
        await createUnit({
          name: form.name,
          symbol: form.symbol,
          category: form.category,
          base_unit_id: form.base_unit_id ? Number(form.base_unit_id) : null,
          conversion_factor: form.conversion_factor,
          company_id: companyId!,
        });
        toast({ title: "Unite creee" });
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={unit ? "Modifier l'unite" : "Nouvelle unite de mesure"}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Kilogramme" required />
          </div>
          <div className="space-y-2">
            <Label>Symbole *</Label>
            <Input value={form.symbol} onChange={(e) => updateField("symbol", e.target.value)} placeholder="kg" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Categorie *</Label>
          <Select value={form.category} onValueChange={(v) => { updateField("category", v); updateField("base_unit_id", ""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Unite de base</Label>
            <Select value={form.base_unit_id || "none"} onValueChange={(v) => updateField("base_unit_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Aucune (unite de base)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune (unite de base)</SelectItem>
                {filteredBaseUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>{u.symbol} - {u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Facteur de conversion</Label>
            <Input
              type="number"
              step="0.000001"
              min="0.000001"
              value={form.conversion_factor}
              onChange={(e) => updateField("conversion_factor", Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
