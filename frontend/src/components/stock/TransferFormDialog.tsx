import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/FormDialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { createTransfer, listWarehouses, listProducts, listLots, type ProductListParams, type LotListParams, type WarehouseListParams } from "@/services/stock";
import type { Warehouse, Product, Lot } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface TransferLine {
  product_id: string;
  lot_id: string;
  quantity_sent: number;
}

interface Form {
  source_warehouse_id: string;
  destination_warehouse_id: string;
  transfer_date: string;
  expected_arrival_date: string;
  notes: string;
  lines: TransferLine[];
}

const defaultLine: TransferLine = { product_id: "", lot_id: "", quantity_sent: 0 };

const defaultForm: Form = {
  source_warehouse_id: "",
  destination_warehouse_id: "",
  transfer_date: new Date().toISOString().split("T")[0] ?? "",
  expected_arrival_date: "",
  notes: "",
  lines: [{ ...defaultLine }],
};

export function TransferFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const companyId = useAuthStore((s) => s.user?.company_id);

  useEffect(() => {
    if (!open || !companyId) return;
    setForm({ ...defaultForm, lines: [{ ...defaultLine }] });
    listWarehouses({ company_id: companyId, is_active: true, page_size: 200 } as WarehouseListParams)
      .then((r) => setWarehouses(r.items))
      .catch(() => {});
    listProducts({ company_id: companyId, is_active: true, product_type: "stockable", page_size: 500 } as ProductListParams)
      .then((r) => setProducts(r.items))
      .catch(() => {});
    listLots({ company_id: companyId, page_size: 500 } as LotListParams)
      .then((r) => setLots(r.items))
      .catch(() => {});
  }, [open, companyId]);

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateLine = (index: number, field: keyof TransferLine, value: string | number) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index]!, [field]: value };
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...defaultLine }] }));
  };

  const removeLine = (index: number) => {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!form.source_warehouse_id || !form.destination_warehouse_id) return;
    if (form.source_warehouse_id === form.destination_warehouse_id) {
      toast({ title: "Erreur", description: "Source et destination doivent etre differents", variant: "destructive" });
      return;
    }
    const validLines = form.lines.filter((l) => l.product_id && l.quantity_sent > 0);
    if (validLines.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins une ligne", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await createTransfer({
        source_warehouse_id: Number(form.source_warehouse_id),
        destination_warehouse_id: Number(form.destination_warehouse_id),
        transfer_date: form.transfer_date,
        expected_arrival_date: form.expected_arrival_date || null,
        notes: form.notes || null,
        company_id: companyId!,
        lines: validLines.map((l) => ({
          product_id: Number(l.product_id),
          lot_id: l.lot_id ? Number(l.lot_id) : null,
          quantity_sent: l.quantity_sent,
        })),
      });
      toast({ title: "Transfert cree" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de creer le transfert", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau transfert inter-entrepots"
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="sm:max-w-[750px]"
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Entrepot source *</Label>
            <Select value={form.source_warehouse_id} onValueChange={(v) => updateField("source_warehouse_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>{w.code} - {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Entrepot destination *</Label>
            <Select value={form.destination_warehouse_id} onValueChange={(v) => updateField("destination_warehouse_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>{w.code} - {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date de transfert *</Label>
            <Input type="date" value={form.transfer_date} onChange={(e) => updateField("transfer_date", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Date d'arrivee prevue</Label>
            <Input type="date" value={form.expected_arrival_date} onChange={(e) => updateField("expected_arrival_date", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Lignes *</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" />Ajouter
            </Button>
          </div>
          <div className="space-y-2">
            {form.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_100px_32px] gap-2 items-end">
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Article</Label>}
                  <Select value={line.product_id} onValueChange={(v) => updateLine(index, "product_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Article" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.sku} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Lot</Label>}
                  <Select value={line.lot_id || "none"} onValueChange={(v) => updateLine(index, "lot_id", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Lot" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {lots
                        .filter((l) => !line.product_id || l.product_id === Number(line.product_id))
                        .map((l) => (
                          <SelectItem key={l.id} value={l.id.toString()}>{l.lot_number}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Quantite</Label>}
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={line.quantity_sent || ""}
                    onChange={(e) => updateLine(index, "quantity_sent", Number(e.target.value))}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(index)}
                  disabled={form.lines.length <= 1}
                  className={index === 0 ? "mt-5" : ""}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
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
