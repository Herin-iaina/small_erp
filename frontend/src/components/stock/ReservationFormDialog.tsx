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
import { createReservation, listProducts, listWarehouses, listLocations, listLots } from "@/services/stock";
import type { Product, StockLocation, Warehouse, Lot } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Form {
  product_id: string;
  location_id: string;
  lot_id: string;
  quantity: number;
  reference_type: string;
  reference_label: string;
  expiry_date: string;
  notes: string;
}

const defaultForm: Form = {
  product_id: "",
  location_id: "",
  lot_id: "",
  quantity: 0,
  reference_type: "manual",
  reference_label: "",
  expiry_date: "",
  notes: "",
};

export function ReservationFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
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

    listLots({ company_id: companyId, page_size: 200 })
      .then((r) => setLots(r.items))
      .catch(() => {});
  }, [open, companyId]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createReservation({
        product_id: Number(form.product_id),
        location_id: Number(form.location_id),
        lot_id: form.lot_id ? Number(form.lot_id) : null,
        quantity: form.quantity,
        reference_type: form.reference_type,
        reference_label: form.reference_label || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
        company_id: companyId!,
      });
      toast({ title: "Reservation creee" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de creer la reservation", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvelle reservation de stock"
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="sm:max-w-[600px]"
    >
      <div className="grid gap-4">
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

        <div className="space-y-2">
          <Label>Emplacement *</Label>
          <Select value={form.location_id} onValueChange={(v) => updateField("location_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selectionner un emplacement" /></SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.code} - {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Lot (optionnel)</Label>
          <Select value={form.lot_id} onValueChange={(v) => updateField("lot_id", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Aucun lot" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun lot</SelectItem>
              {lots.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.lot_number}{l.product ? ` (${l.product.name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Quantite *</Label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={form.quantity}
            onChange={(e) => updateField("quantity", Number(e.target.value))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type de reference *</Label>
            <Select value={form.reference_type} onValueChange={(v) => updateField("reference_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_order">Commande de vente</SelectItem>
                <SelectItem value="production_order">Ordre de production</SelectItem>
                <SelectItem value="manual">Manuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Label reference</Label>
            <Input
              value={form.reference_label}
              onChange={(e) => updateField("reference_label", e.target.value)}
              placeholder="Ex: CMD-00123"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Date d'expiration (optionnel)</Label>
          <Input
            type="date"
            value={form.expiry_date}
            onChange={(e) => updateField("expiry_date", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </FormDialog>
  );
}
