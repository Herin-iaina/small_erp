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
import { CategorySelect } from "./CategorySelect";
import { toast } from "@/hooks/use-toast";
import { createProduct, updateProduct } from "@/services/stock";
import type { Product } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}

interface Form {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category_id: number | null;
  product_type: string;
  unit_of_measure: string;
  sale_price: number;
  cost_price: number;
  tax_rate: number;
  tracking_type: string;
  valuation_method: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  reorder_quantity: number;
  weight: string;
  lead_time_days: number;
}

const defaultForm: Form = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  category_id: null,
  product_type: "stockable",
  unit_of_measure: "pce",
  sale_price: 0,
  cost_price: 0,
  tax_rate: 20,
  tracking_type: "none",
  valuation_method: "cump",
  min_stock_level: 0,
  max_stock_level: 0,
  reorder_point: 0,
  reorder_quantity: 0,
  weight: "",
  lead_time_days: 0,
};

export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              sku: product.sku,
              barcode: product.barcode ?? "",
              name: product.name,
              description: product.description ?? "",
              category_id: product.category_id,
              product_type: product.product_type,
              unit_of_measure: product.unit_of_measure,
              sale_price: product.sale_price,
              cost_price: product.cost_price,
              tax_rate: product.tax_rate,
              tracking_type: product.tracking_type,
              valuation_method: product.valuation_method,
              min_stock_level: product.min_stock_level,
              max_stock_level: product.max_stock_level,
              reorder_point: product.reorder_point,
              reorder_quantity: product.reorder_quantity,
              weight: product.weight?.toString() ?? "",
              lead_time_days: product.lead_time_days,
            }
          : defaultForm
      );
    }
  }, [open, product]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        weight: form.weight ? Number(form.weight) : null,
        barcode: form.barcode || null,
        description: form.description || null,
      };
      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct({ ...payload, company_id: companyId! });
      }
      toast({ title: "Article enregistre" });
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
      title={product ? "Modifier l'article" : "Nouvel article"}
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="sm:max-w-[700px]"
    >
      <div className="space-y-6">
        {/* Section: Informations */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Informations</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => updateField("sku", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Code-barres</Label>
              <Input value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Categorie</Label>
              <CategorySelect companyId={companyId!} value={form.category_id} onChange={(v) => updateField("category_id", v)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.product_type} onValueChange={(v) => updateField("product_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stockable">Stockable</SelectItem>
                  <SelectItem value="consumable">Consommable</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unite de mesure</Label>
              <Select value={form.unit_of_measure} onValueChange={(v) => updateField("unit_of_measure", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pce">Piece</SelectItem>
                  <SelectItem value="kg">Kilogramme</SelectItem>
                  <SelectItem value="l">Litre</SelectItem>
                  <SelectItem value="m">Metre</SelectItem>
                  <SelectItem value="m2">m2</SelectItem>
                  <SelectItem value="m3">m3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input type="number" step="0.001" value={form.weight} onChange={(e) => updateField("weight", e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={2} />
            </div>
          </div>
        </div>

        {/* Section: Prix */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Prix</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prix de vente HT</Label>
              <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => updateField("sale_price", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Prix de revient</Label>
              <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => updateField("cost_price", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>TVA (%)</Label>
              <Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => updateField("tax_rate", Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Section: Stock */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Stock</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tracabilite</Label>
              <Select value={form.tracking_type} onValueChange={(v) => updateField("tracking_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  <SelectItem value="lot">Par lot</SelectItem>
                  <SelectItem value="serial">Par N/S</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valorisation</Label>
              <Select value={form.valuation_method} onValueChange={(v) => updateField("valuation_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cump">CUMP</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                  <SelectItem value="lifo">LIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock minimum</Label>
              <Input type="number" step="0.001" value={form.min_stock_level} onChange={(e) => updateField("min_stock_level", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Stock maximum</Label>
              <Input type="number" step="0.001" value={form.max_stock_level} onChange={(e) => updateField("max_stock_level", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Point de commande</Label>
              <Input type="number" step="0.001" value={form.reorder_point} onChange={(e) => updateField("reorder_point", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Qte de commande</Label>
              <Input type="number" step="0.001" value={form.reorder_quantity} onChange={(e) => updateField("reorder_quantity", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Delai (jours)</Label>
              <Input type="number" value={form.lead_time_days} onChange={(e) => updateField("lead_time_days", Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
