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
import { createMovement, listProducts, listWarehouses, listLocations } from "@/services/stock";
import type { Product, StockLocation, Warehouse } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Form {
  movement_type: string;
  product_id: string;
  lot_id: string;
  source_location_id: string;
  destination_location_id: string;
  quantity: number;
  unit_cost: string;
  reason: string;
  notes: string;
}

const defaultForm: Form = {
  movement_type: "in",
  product_id: "",
  lot_id: "",
  source_location_id: "",
  destination_location_id: "",
  quantity: 0,
  unit_cost: "",
  reason: "",
  notes: "",
};

export function MovementFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (!open || !companyId) return;
    setForm(defaultForm);
    listProducts({ company_id: companyId, page_size: 200, is_active: true })
      .then((r) => setProducts(r.items))
      .catch(() => {});
    // Load all locations from all warehouses
    listWarehouses({ company_id: companyId, page_size: 100, is_active: true })
      .then(async (r) => {
        const allLocs: StockLocation[] = [];
        for (const wh of r.items as Warehouse[]) {
          const locs = await listLocations(wh.id, { page_size: 100 });
          allLocs.push(...locs.items);
        }
        setLocations(allLocs);
      })
      .catch(() => {});
  }, [open, companyId]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const needsSource = form.movement_type === "out" || form.movement_type === "transfer";
  const needsDest = form.movement_type === "in" || form.movement_type === "transfer" || form.movement_type === "adjustment";

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createMovement({
        movement_type: form.movement_type,
        product_id: Number(form.product_id),
        lot_id: form.lot_id ? Number(form.lot_id) : null,
        source_location_id: form.source_location_id ? Number(form.source_location_id) : null,
        destination_location_id: form.destination_location_id ? Number(form.destination_location_id) : null,
        quantity: form.quantity,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
        company_id: companyId!,
      });
      toast({ title: "Mouvement cree (brouillon)" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de creer le mouvement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau mouvement de stock"
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="sm:max-w-[600px]"
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={form.movement_type} onValueChange={(v) => updateField("movement_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Entree</SelectItem>
              <SelectItem value="out">Sortie</SelectItem>
              <SelectItem value="transfer">Transfert</SelectItem>
              <SelectItem value="adjustment">Ajustement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Article *</Label>
          <Select value={form.product_id} onValueChange={(v) => updateField("product_id", v)}>
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
        {needsSource && (
          <div className="space-y-2">
            <Label>Emplacement source *</Label>
            <Select value={form.source_location_id} onValueChange={(v) => updateField("source_location_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>
                    {l.code} - {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {needsDest && (
          <div className="space-y-2">
            <Label>Emplacement destination *</Label>
            <Select value={form.destination_location_id} onValueChange={(v) => updateField("destination_location_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>
                    {l.code} - {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantite *</Label>
            <Input type="number" step="0.001" min="0.001" value={form.quantity} onChange={(e) => updateField("quantity", Number(e.target.value))} required />
          </div>
          <div className="space-y-2">
            <Label>Cout unitaire</Label>
            <Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => updateField("unit_cost", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Motif</Label>
          <Input value={form.reason} onChange={(e) => updateField("reason", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} />
        </div>
      </div>
    </FormDialog>
  );
}
