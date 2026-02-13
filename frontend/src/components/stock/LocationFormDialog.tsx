import { useEffect, useState } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { createLocation, updateLocation } from "@/services/stock";
import type { StockLocation } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: number;
  location: StockLocation | null;
  onSuccess: () => void;
}

interface Form {
  name: string;
  code: string;
  aisle: string;
  shelf: string;
  bin: string;
  location_type: string;
}

const defaultForm: Form = { name: "", code: "", aisle: "", shelf: "", bin: "", location_type: "storage" };

export function LocationFormDialog({ open, onOpenChange, warehouseId, location, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (open) {
      setForm(
        location
          ? {
              name: location.name,
              code: location.code,
              aisle: location.aisle ?? "",
              shelf: location.shelf ?? "",
              bin: location.bin ?? "",
              location_type: location.location_type,
            }
          : defaultForm
      );
    }
  }, [open, location]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (location) {
        await updateLocation(location.id, form);
      } else {
        await createLocation(warehouseId, { ...form, company_id: companyId! });
      }
      toast({ title: "Emplacement enregistre" });
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
      title={location ? "Modifier l'emplacement" : "Nouvel emplacement"}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input value={form.code} onChange={(e) => updateField("code", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Allee</Label>
          <Input value={form.aisle} onChange={(e) => updateField("aisle", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Etagere</Label>
          <Input value={form.shelf} onChange={(e) => updateField("shelf", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Casier</Label>
          <Input value={form.bin} onChange={(e) => updateField("bin", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.location_type} onValueChange={(v) => updateField("location_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="storage">Stockage</SelectItem>
              <SelectItem value="receiving">Reception</SelectItem>
              <SelectItem value="shipping">Expedition</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="transit">Transit</SelectItem>
              <SelectItem value="customer">Client</SelectItem>
              <SelectItem value="defective">Defectueux</SelectItem>
              <SelectItem value="returns">Retours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDialog>
  );
}
