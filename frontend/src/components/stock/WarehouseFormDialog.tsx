import { useEffect, useState } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { createWarehouse, updateWarehouse } from "@/services/stock";
import type { Warehouse } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
  onSuccess: () => void;
}

interface Form {
  name: string;
  code: string;
  address: string;
}

const defaultForm: Form = { name: "", code: "", address: "" };

export function WarehouseFormDialog({ open, onOpenChange, warehouse, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (open) {
      setForm(
        warehouse
          ? { name: warehouse.name, code: warehouse.code, address: warehouse.address ?? "" }
          : defaultForm
      );
    }
  }, [open, warehouse]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (warehouse) {
        await updateWarehouse(warehouse.id, form);
      } else {
        await createWarehouse({ ...form, company_id: companyId! });
      }
      toast({ title: "Entrepot enregistre" });
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
      title={warehouse ? "Modifier l'entrepot" : "Nouvel entrepot"}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="wh_name">Nom *</Label>
          <Input id="wh_name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh_code">Code *</Label>
          <Input id="wh_code" value={form.code} onChange={(e) => updateField("code", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh_address">Adresse</Label>
          <Textarea id="wh_address" value={form.address} onChange={(e) => updateField("address", e.target.value)} rows={2} />
        </div>
      </div>
    </FormDialog>
  );
}
