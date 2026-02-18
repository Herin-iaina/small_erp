import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, SlidersHorizontal, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MovementFormDialog } from "@/components/stock/MovementFormDialog";
import { ProductFormDialog } from "@/components/stock/ProductFormDialog";
import { MovementTypeBadge } from "@/components/stock/MovementTypeBadge";
import { MovementStatusBadge } from "@/components/stock/MovementStatusBadge";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import {
  getProduct,
  getProductAvailability,
  getConsumptionStats,
  getProductMovementHistory,
  listProductBarcodes,
  addProductBarcode,
  deleteProductBarcode,
} from "@/services/stock";
import type {
  Product,
  ProductAvailability,
  ConsumptionStats,
  StockMovement,
  ProductBarcode,
} from "@/types/stock";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const productId = Number(id);

  const [product, setProduct] = useState<Product | null>(null);
  const [availability, setAvailability] = useState<ProductAvailability | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionStats | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementTotal, setMovementTotal] = useState(0);
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stock" | "movements" | "barcodes">("stock");

  // Movement filters
  const [movementType, setMovementType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [movementPage, setMovementPage] = useState(1);

  // Dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [barcodeFormOpen, setBarcodeFormOpen] = useState(false);
  const [newBarcode, setNewBarcode] = useState({ barcode: "", barcode_type: "EAN13", is_primary: false });

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [p, a, c] = await Promise.all([
        getProduct(productId),
        getProductAvailability(productId).catch(() => null),
        getConsumptionStats(productId).catch(() => null),
      ]);
      setProduct(p);
      setAvailability(a);
      setConsumption(c);
    } catch {
      toast({ title: "Erreur", description: "Produit introuvable", variant: "destructive" });
      navigate("/stock/products");
    } finally {
      setLoading(false);
    }
  }, [productId, navigate]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  const loadMovements = useCallback(async () => {
    if (!productId) return;
    try {
      const result = await getProductMovementHistory(productId, {
        movement_type: movementType === "all" ? undefined : movementType,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: movementPage,
        page_size: 20,
      });
      setMovements(result.items);
      setMovementTotal(result.total);
    } catch {
      setMovements([]);
    }
  }, [productId, movementType, dateFrom, dateTo, movementPage]);

  useEffect(() => {
    if (activeTab === "movements") loadMovements();
  }, [activeTab, loadMovements]);

  const loadBarcodes = useCallback(async () => {
    if (!productId) return;
    try {
      setBarcodes(await listProductBarcodes(productId));
    } catch {
      setBarcodes([]);
    }
  }, [productId]);

  useEffect(() => {
    if (activeTab === "barcodes") loadBarcodes();
  }, [activeTab, loadBarcodes]);

  const handleAddBarcode = async () => {
    try {
      await addProductBarcode(productId, newBarcode);
      toast({ title: "Code-barres ajoute" });
      setBarcodeFormOpen(false);
      setNewBarcode({ barcode: "", barcode_type: "EAN13", is_primary: false });
      loadBarcodes();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter le code-barres", variant: "destructive" });
    }
  };

  const handleDeleteBarcode = async (barcodeId: number) => {
    try {
      await deleteProductBarcode(barcodeId);
      toast({ title: "Code-barres supprime" });
      loadBarcodes();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const movementPages = Math.ceil(movementTotal / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stock/products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <Badge variant={product.is_active ? "default" : "secondary"}>
              {product.is_active ? "Actif" : "Inactif"}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono">{product.sku}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          {product.product_type === "stockable" && (
            <Button variant="outline" onClick={() => setAdjustmentOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Ajuster le stock
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="text-muted-foreground">Categorie</span>
              <span>{product.category?.name || "-"}</span>
              <span className="text-muted-foreground">Type</span>
              <span>{product.product_type}</span>
              <span className="text-muted-foreground">UOM</span>
              <span>{product.unit?.symbol ?? product.unit_of_measure}</span>
              <span className="text-muted-foreground">Suivi</span>
              <span>{product.tracking_type}</span>
              <span className="text-muted-foreground">Prix vente</span>
              <span>{formatCurrency(product.sale_price)}</span>
              <span className="text-muted-foreground">Prix revient</span>
              <span>{formatCurrency(product.cost_price)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {availability ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{Number(availability.physical_stock).toLocaleString("fr-FR")}</div>
                  <div className="text-xs text-muted-foreground">Physique</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">{Number(availability.reserved_stock).toLocaleString("fr-FR")}</div>
                  <div className="text-xs text-muted-foreground">Reserve</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{Number(availability.available_stock).toLocaleString("fr-FR")}</div>
                  <div className="text-xs text-muted-foreground">Disponible</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pas de donnees stock</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consommation</CardTitle>
          </CardHeader>
          <CardContent>
            {consumption ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{Number(consumption.avg_7d).toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Moy. 7j</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{Number(consumption.avg_30d).toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Moy. 30j</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{Number(consumption.avg_90d).toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Moy. 90j</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pas de donnees</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["stock", "movements", "barcodes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "stock" ? "Stock par emplacement" : tab === "movements" ? "Historique mouvements" : "Codes-barres"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "stock" && availability && (
        <Card>
          <CardContent className="p-0">
            {availability.by_location.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Aucun stock</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emplacement</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-right">Quantite</TableHead>
                    <TableHead className="text-right">Reserve</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availability.by_location.map((loc, i) => (
                    <TableRow key={i}>
                      <TableCell>{loc.location_name}</TableCell>
                      <TableCell className="font-mono">{loc.lot_number || "-"}</TableCell>
                      <TableCell className="text-right">{Number(loc.quantity).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right">{Number(loc.reserved_quantity).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right font-semibold">{Number(loc.available_quantity).toLocaleString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "movements" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={movementType} onValueChange={(v) => { setMovementType(v); setMovementPage(1); }}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="in">Entree</SelectItem>
                  <SelectItem value="out">Sortie</SelectItem>
                  <SelectItem value="transfer">Transfert</SelectItem>
                  <SelectItem value="adjustment">Ajustement</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setMovementPage(1); }} className="w-[160px]" placeholder="Du" />
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setMovementPage(1); }} className="w-[160px]" placeholder="Au" />
              <span className="text-sm text-muted-foreground ml-auto">{movementTotal} mouvement(s)</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Aucun mouvement</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead className="text-right">Quantite</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="font-mono text-sm">{m.reference}</TableCell>
                        <TableCell><MovementTypeBadge type={m.movement_type} /></TableCell>
                        <TableCell>{m.source_location?.name || "-"}</TableCell>
                        <TableCell>{m.destination_location?.name || "-"}</TableCell>
                        <TableCell className="text-right">{Number(m.quantity).toLocaleString("fr-FR")}</TableCell>
                        <TableCell><MovementStatusBadge status={m.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {movementPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-3 border-t">
                    <Button variant="outline" size="sm" disabled={movementPage <= 1} onClick={() => setMovementPage(movementPage - 1)}>
                      Precedent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {movementPage} / {movementPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={movementPage >= movementPages} onClick={() => setMovementPage(movementPage + 1)}>
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "barcodes" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Codes-barres ({barcodes.length})</CardTitle>
            <Button size="sm" onClick={() => setBarcodeFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {barcodes.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Aucun code-barres supplementaire</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code-barres</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barcodes.map((bc) => (
                    <TableRow key={bc.id}>
                      <TableCell className="font-mono">{bc.barcode}</TableCell>
                      <TableCell>{bc.barcode_type}</TableCell>
                      <TableCell>{bc.is_primary ? <Badge>Principal</Badge> : "-"}</TableCell>
                      <TableCell>{new Date(bc.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBarcode(bc.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} onSuccess={() => { loadProduct(); setEditOpen(false); }} />

      <MovementFormDialog
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        onSuccess={() => { loadProduct(); }}
        defaultMovementType="adjustment"
        defaultProductId={productId}
      />

      <FormDialog
        open={barcodeFormOpen}
        onOpenChange={setBarcodeFormOpen}
        title="Ajouter un code-barres"
        onSubmit={handleAddBarcode}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Code-barres *</Label>
            <Input value={newBarcode.barcode} onChange={(e) => setNewBarcode({ ...newBarcode, barcode: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={newBarcode.barcode_type} onValueChange={(v) => setNewBarcode({ ...newBarcode, barcode_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EAN13">EAN-13</SelectItem>
                <SelectItem value="EAN8">EAN-8</SelectItem>
                <SelectItem value="UPC">UPC</SelectItem>
                <SelectItem value="Code128">Code 128</SelectItem>
                <SelectItem value="QR">QR Code</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
