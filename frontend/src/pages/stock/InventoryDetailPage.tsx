import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/FormDialog";
import { MovementStatusBadge } from "@/components/stock/MovementStatusBadge";
import { toast } from "@/hooks/use-toast";
import {
  getInventory,
  updateInventoryLine,
  addInventoryLine,
  listProducts,
  listLocations,
} from "@/services/stock";
import type { Inventory, InventoryLine, Product, StockLocation } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [addLineLoading, setAddLineLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [lineForm, setLineForm] = useState({ product_id: "", location_id: "", expected_quantity: 0 });

  const loadInventory = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getInventory(Number(id));
      setInventory(data);
    } catch {
      toast({ title: "Erreur", description: "Inventaire introuvable", variant: "destructive" });
      navigate("/stock/inventories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCountUpdate = async (line: InventoryLine, value: string) => {
    if (!inventory) return;
    const counted = value === "" ? undefined : Number(value);
    try {
      const updated = await updateInventoryLine(inventory.id, line.id, {
        counted_quantity: counted,
      });
      setInventory(updated);
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre a jour", variant: "destructive" });
    }
  };

  const openAddLine = async () => {
    if (!inventory || !companyId) return;
    setLineForm({ product_id: "", location_id: "", expected_quantity: 0 });
    try {
      const [productsRes, locsRes] = await Promise.all([
        listProducts({ company_id: companyId, page_size: 200, is_active: true }),
        listLocations(inventory.warehouse_id, { page_size: 100 }),
      ]);
      setProducts(productsRes.items);
      setLocations(locsRes.items);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les donnees", variant: "destructive" });
      return;
    }
    setAddLineOpen(true);
  };

  const handleAddLine = async () => {
    if (!inventory) return;
    setAddLineLoading(true);
    try {
      const updated = await addInventoryLine(inventory.id, {
        product_id: Number(lineForm.product_id),
        location_id: Number(lineForm.location_id),
        expected_quantity: lineForm.expected_quantity,
      });
      setInventory(updated);
      setAddLineOpen(false);
      toast({ title: "Ligne ajoutee" });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter la ligne", variant: "destructive" });
    } finally {
      setAddLineLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inventory) return null;

  const canAddLines = inventory.status === "draft" || inventory.status === "in_progress";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stock/inventories")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{inventory.name}</h1>
          <p className="text-muted-foreground font-mono">{inventory.reference}</p>
        </div>
        <div className="ml-auto">
          <MovementStatusBadge status={inventory.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Entrepot</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{inventory.warehouse?.name}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cree par</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold">
              {inventory.created_by ? `${inventory.created_by.first_name} ${inventory.created_by.last_name}` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lignes</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{inventory.lines.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lignes d'inventaire</CardTitle>
          {canAddLines && (
            <Button size="sm" onClick={openAddLine}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un article
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead className="text-right">Qte attendue</TableHead>
                <TableHead className="text-right w-[140px]">Qte comptee</TableHead>
                <TableHead className="text-right">Ecart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Aucune ligne — cliquez sur "Ajouter un article" pour commencer
                  </TableCell>
                </TableRow>
              ) : (
                inventory.lines.map((line) => {
                  const diff = line.difference;
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.product ? `${line.product.sku} - ${line.product.name}` : "-"}
                      </TableCell>
                      <TableCell>{line.location?.code || "-"}</TableCell>
                      <TableCell>{line.lot?.lot_number || "-"}</TableCell>
                      <TableCell className="text-right">{Number(line.expected_quantity).toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        {inventory.status === "in_progress" ? (
                          <Input
                            type="number"
                            step="0.001"
                            className="w-[120px] ml-auto text-right"
                            defaultValue={line.counted_quantity ?? ""}
                            onBlur={(e) => handleCountUpdate(line, e.target.value)}
                          />
                        ) : (
                          line.counted_quantity != null ? Number(line.counted_quantity).toFixed(1) : "-"
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${diff != null && diff !== 0 ? (diff > 0 ? "text-green-600" : "text-red-600") : ""}`}>
                        {diff != null ? (diff > 0 ? `+${Number(diff).toFixed(1)}` : Number(diff).toFixed(1)) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormDialog
        open={addLineOpen}
        onOpenChange={setAddLineOpen}
        title="Ajouter un article a l'inventaire"
        onSubmit={handleAddLine}
        loading={addLineLoading}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Article *</Label>
            <Select value={lineForm.product_id} onValueChange={(v) => setLineForm((p) => ({ ...p, product_id: v }))}>
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
            <Select value={lineForm.location_id} onValueChange={(v) => setLineForm((p) => ({ ...p, location_id: v }))}>
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
            <Label>Quantite attendue</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={lineForm.expected_quantity}
              onChange={(e) => setLineForm((p) => ({ ...p, expected_quantity: Number(e.target.value) }))}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
