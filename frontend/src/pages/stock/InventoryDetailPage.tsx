import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MovementStatusBadge } from "@/components/stock/MovementStatusBadge";
import { toast } from "@/hooks/use-toast";
import { getInventory, updateInventoryLine } from "@/services/stock";
import type { Inventory, InventoryLine } from "@/types/stock";

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inventory) return null;

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
        <CardHeader>
          <CardTitle>Lignes d'inventaire</CardTitle>
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
                    Aucune ligne
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
    </div>
  );
}
