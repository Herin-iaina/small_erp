import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, Calculator, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  getReplenishmentSuggestions,
  calculateReorderPoints,
  calculateAbcClassification,
} from "@/services/stock";
import type { ReplenishmentSuggestion } from "@/types/stock";
import { useAuthStore } from "@/stores/authStore";

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getAbcBadgeVariant(abc: string | null): "default" | "secondary" | "outline" {
  switch (abc) {
    case "A":
      return "default";
    case "B":
      return "secondary";
    case "C":
      return "outline";
    default:
      return "outline";
  }
}

export default function ReplenishmentPage() {
  const companyId = useAuthStore((s) => s.user?.company_id);
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryNameFilter, setCategoryNameFilter] = useState<string>("all");
  const [abcFilter, setAbcFilter] = useState<string>("all");
  const [recalculating, setRecalculating] = useState(false);

  const loadSuggestions = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getReplenishmentSuggestions(companyId);
      setSuggestions(data);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les suggestions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    suggestions.forEach((s) => {
      if (s.category_name) names.add(s.category_name);
    });
    return Array.from(names).sort();
  }, [suggestions]);

  const filtered = useMemo(() => {
    return suggestions.filter((s) => {
      if (categoryNameFilter !== "all" && s.category_name !== categoryNameFilter) return false;
      if (abcFilter !== "all" && s.abc_classification !== abcFilter) return false;
      return true;
    });
  }, [suggestions, categoryNameFilter, abcFilter]);

  const alertCount = filtered.filter((s) => s.available_stock <= s.reorder_point).length;
  const totalEstimatedCost = filtered.reduce((sum, s) => sum + s.estimated_cost, 0);

  const handleRecalculateReorderPoints = async () => {
    if (!companyId) return;
    setRecalculating(true);
    try {
      const result = await calculateReorderPoints(companyId);
      toast({
        title: "Points de commande recalcules",
        description: `${result.updated_count} produit(s) mis a jour`,
      });
      await loadSuggestions();
    } catch {
      toast({ title: "Erreur", description: "Impossible de recalculer les points de commande", variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalculateAbc = async () => {
    if (!companyId) return;
    setRecalculating(true);
    try {
      const result = await calculateAbcClassification(companyId);
      const total = Object.values(result.classifications).reduce((a, b) => a + b, 0);
      toast({
        title: "Classification ABC recalculee",
        description: `${total} produit(s) classifie(s)`,
      });
      await loadSuggestions();
    } catch {
      toast({ title: "Erreur", description: "Impossible de recalculer la classification ABC", variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reapprovisionnement</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRecalculateReorderPoints}
            disabled={recalculating}
          >
            {recalculating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Recalculer points de commande
          </Button>
          <Button
            variant="outline"
            onClick={handleRecalculateAbc}
            disabled={recalculating}
          >
            {recalculating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Recalculer ABC
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produits en alerte
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(alertCount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valeur totale estimee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalEstimatedCost)} &euro;
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={categoryNameFilter}
          onValueChange={setCategoryNameFilter}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes categories</SelectItem>
            {categoryNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={abcFilter}
          onValueChange={setAbcFilter}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Classification ABC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {formatNumber(filtered.length)} suggestion(s)
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Aucune suggestion de reapprovisionnement</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead className="text-right">Stock actuel</TableHead>
                  <TableHead className="text-right">Reserve</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Point de commande</TableHead>
                  <TableHead className="text-right">Qte suggeree</TableHead>
                  <TableHead className="text-right">Delai (jours)</TableHead>
                  <TableHead className="text-right">Cout estime</TableHead>
                  <TableHead>ABC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow
                    key={s.product_id}
                    className={s.available_stock === 0 ? "bg-red-50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell className="font-mono text-sm">{s.sku}</TableCell>
                    <TableCell>{s.product_name}</TableCell>
                    <TableCell>{s.category_name || "-"}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.current_stock)}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.reserved_stock)}</TableCell>
                    <TableCell className={`text-right font-semibold ${s.available_stock === 0 ? "text-red-600" : ""}`}>
                      {formatNumber(s.available_stock)}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(s.reorder_point)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(s.suggested_quantity)}</TableCell>
                    <TableCell className="text-right">{s.lead_time_days}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.estimated_cost)} &euro;</TableCell>
                    <TableCell>
                      {s.abc_classification ? (
                        <Badge variant={getAbcBadgeVariant(s.abc_classification)}>
                          {s.abc_classification}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
