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
import { createLot, updateLot, listProducts, listSuppliers } from "@/services/stock";
import type { Lot, Product } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: Lot | null;
  onSuccess: () => void;
}

interface Form {
  product_id: string;
  lot_number: string;
  supplier_id: string;
  expiry_date: string;
  best_before_date: string;
  manufacturing_date: string;
  notes: string;
}

const defaultForm: Form = {
  product_id: "",
  lot_number: "",
  supplier_id: "",
  expiry_date: "",
  best_before_date: "",
  manufacturing_date: "",
  notes: "",
};

export function LotFormDialog({ open, onOpenChange, lot, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string; code: string }[]>([]);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (!open || !companyId) return;
    listProducts({ company_id: companyId, page_size: 200, is_active: true })
      .then((r) => setProducts(r.items))
      .catch(() => {});
    listSuppliers(companyId)
      .then(setSuppliers)
      .catch(() => {});
    setForm(
      lot
        ? {
            product_id: lot.product_id.toString(),
            lot_number: lot.lot_number,
            supplier_id: lot.supplier_id ? lot.supplier_id.toString() : "",
            expiry_date: lot.expiry_date ?? "",
            best_before_date: lot.best_before_date ?? "",
            manufacturing_date: lot.manufacturing_date ?? "",
            notes: lot.notes ?? "",
          }
        : defaultForm
    );
  }, [open, lot, companyId]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        lot_number: form.lot_number,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        expiry_date: form.expiry_date || null,
        best_before_date: form.best_before_date || null,
        manufacturing_date: form.manufacturing_date || null,
        notes: form.notes || null,
      };
      if (lot) {
        await updateLot(lot.id, payload);
      } else {
        await createLot({
          ...payload,
          product_id: Number(form.product_id),
          company_id: companyId!,
        });
      }
      toast({ title: "Lot enregistre" });
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
      title={lot ? "Modifier le lot" : "Nouveau lot"}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Article *</Label>
          <Select value={form.product_id} onValueChange={(v) => updateField("product_id", v)} disabled={!!lot}>
            <SelectTrigger><SelectValue placeholder="Selectionner un article" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.sku} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Numero de lot *</Label>
          <Input value={form.lot_number} onChange={(e) => updateField("lot_number", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Fournisseur</Label>
          <Select value={form.supplier_id} onValueChange={(v) => updateField("supplier_id", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Selectionner un fournisseur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.code} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>DLC</Label>
            <Input type="date" value={form.expiry_date} onChange={(e) => updateField("expiry_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>DLUO</Label>
            <Input type="date" value={form.best_before_date} onChange={(e) => updateField("best_before_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fabrication</Label>
            <Input type="date" value={form.manufacturing_date} onChange={(e) => updateField("manufacturing_date", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} />
        </div>
      </div>
    </FormDialog>
  );
}
