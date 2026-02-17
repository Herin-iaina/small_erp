import { useEffect, useState } from "react";
import { Package, AlertTriangle, TrendingDown, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/stores/authStore";
import { useCurrency } from "@/hooks/useCurrency";
import { getStockKPIs, getStockAlerts, getStockValuation } from "@/services/stock";
import type { StockKPIs, StockAlert, StockValuationItem } from "@/types/stock";
import { Loader2 } from "lucide-react";

export default function StockDashboard() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const { formatCurrency } = useCurrency();
  const [kpis, setKpis] = useState<StockKPIs | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [valuation, setValuation] = useState<StockValuationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    Promise.all([getStockKPIs(companyId), getStockAlerts(companyId), getStockValuation(companyId)])
      .then(([k, a, v]) => {
        setKpis(k);
        setAlerts(a);
        setValuation(v);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Articles", value: kpis?.total_products ?? 0, icon: Package, color: "text-blue-600" },
    { label: "Valeur stock", value: formatCurrency(kpis?.total_stock_value ?? 0), icon: DollarSign, color: "text-green-600" },
    { label: "Stock bas", value: kpis?.low_stock_count ?? 0, icon: TrendingDown, color: "text-orange-600" },
    { label: "Ruptures", value: kpis?.out_of_stock_count ?? 0, icon: AlertTriangle, color: "text-red-600" },
    { label: "DLC proches", value: kpis?.expiring_soon_count ?? 0, icon: Clock, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de bord stock</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertes stock</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead className="text-right">Stock actuel</TableHead>
                  <TableHead className="text-right">Stock mini</TableHead>
                  <TableHead className="text-right">Point commande</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.product_id}>
                    <TableCell className="font-mono text-sm">{a.sku}</TableCell>
                    <TableCell>{a.product_name}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {Number(a.current_stock).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">{Number(a.min_stock_level).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Number(a.reorder_point).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {valuation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Valorisation du stock</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead className="text-right">Quantite</TableHead>
                  <TableHead className="text-right">Cout unitaire</TableHead>
                  <TableHead className="text-right">Valeur totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuation.map((v) => (
                  <TableRow key={v.product_id}>
                    <TableCell className="font-mono text-sm">{v.sku}</TableCell>
                    <TableCell>{v.product_name}</TableCell>
                    <TableCell className="text-right">{Number(v.quantity).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.unit_cost)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(v.total_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right pt-3 border-t mt-2 font-semibold">
              Total: {formatCurrency(valuation.reduce((sum, v) => sum + Number(v.total_value), 0))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
