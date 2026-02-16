import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { lookupByBarcode, getProductStock } from "@/services/stock";
import type { Product, ProductStockSummary } from "@/types/stock";

export default function BarcodeScannerPage() {
  const { formatCurrency } = useCurrency();
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<ProductStockSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    try {
      const p = await lookupByBarcode(barcode.trim());
      setProduct(p);
      const s = await getProductStock(p.id);
      setStock(s);
    } catch {
      toast({ title: "Produit non trouve", description: `Aucun produit pour le code-barres "${barcode}"`, variant: "destructive" });
      setProduct(null);
      setStock(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Scanner de codes-barres</h1>

      <div className="flex gap-2 max-w-lg">
        <Input
          placeholder="Scannez ou saisissez un code-barres..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="text-lg"
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          Rechercher
        </Button>
      </div>

      {product && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {product.name}
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? "Actif" : "Inactif"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">SKU</span>
                <span className="font-mono">{product.sku}</span>
                <span className="text-muted-foreground">Code-barres</span>
                <span className="font-mono">{product.barcode || "-"}</span>
                <span className="text-muted-foreground">Type</span>
                <span>{product.product_type}</span>
                <span className="text-muted-foreground">Unite</span>
                <span>{product.unit_of_measure}</span>
                <span className="text-muted-foreground">Categorie</span>
                <span>{product.category?.name || "-"}</span>
                <span className="text-muted-foreground">Prix de vente</span>
                <span>{formatCurrency(product.sale_price)}</span>
                <span className="text-muted-foreground">Prix de revient</span>
                <span>{formatCurrency(product.cost_price)}</span>
              </div>
            </CardContent>
          </Card>

          {stock && (
            <Card>
              <CardHeader>
                <CardTitle>Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{Number(stock.total_quantity).toLocaleString("fr-FR")}</div>
                    <div className="text-xs text-muted-foreground">Physique</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{Number(stock.total_reserved).toLocaleString("fr-FR")}</div>
                    <div className="text-xs text-muted-foreground">Reserve</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{Number(stock.total_available).toLocaleString("fr-FR")}</div>
                    <div className="text-xs text-muted-foreground">Disponible</div>
                  </div>
                </div>

                {stock.by_location.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Par emplacement</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1">Emplacement</th>
                          <th className="text-right py-1">Qte</th>
                          <th className="text-right py-1">Dispo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stock.by_location.map((loc, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1">{loc.location_name}</td>
                            <td className="text-right py-1">{Number(loc.quantity).toLocaleString("fr-FR")}</td>
                            <td className="text-right py-1">{Number(loc.available_quantity).toLocaleString("fr-FR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-right text-sm text-muted-foreground">
                  Valeur: {formatCurrency(stock.total_value)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
