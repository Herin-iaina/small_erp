import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MovementTypeBadge } from "@/components/stock/MovementTypeBadge";
import { MovementStatusBadge } from "@/components/stock/MovementStatusBadge";
import { getLotTraceability } from "@/services/stock";
import type { StockMovement } from "@/types/stock";

interface TraceabilityData {
  lot: { id: number; lot_number: string; manufacturing_date: string | null; expiry_date: string | null; best_before_date: string | null; notes: string | null };
  product: { id: number; sku: string; name: string } | null;
  supplier: { id: number; name: string; code: string } | null;
  movements: StockMovement[];
  current_locations: { location_id: number; location_name: string | null; quantity: number; reserved_quantity: number }[];
  total_in: number;
  total_out: number;
}

interface Props {
  lotId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LotTraceabilityDialog({ lotId, open, onOpenChange }: Props) {
  const [data, setData] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !lotId) return;
    setLoading(true);
    getLotTraceability(lotId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, lotId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Tracabilite du lot {data?.lot?.lot_number ?? ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Lot info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Article</span>
              <span>{data.product ? `${data.product.sku} - ${data.product.name}` : "-"}</span>
              <span className="text-muted-foreground">Fournisseur</span>
              <span>{data.supplier?.name || "-"}</span>
              <span className="text-muted-foreground">Date fabrication</span>
              <span>{data.lot.manufacturing_date ? new Date(data.lot.manufacturing_date).toLocaleDateString("fr-FR") : "-"}</span>
              <span className="text-muted-foreground">DLC</span>
              <span>{data.lot.expiry_date ? new Date(data.lot.expiry_date).toLocaleDateString("fr-FR") : "-"}</span>
              <span className="text-muted-foreground">Total entrees</span>
              <span className="font-semibold text-green-600">{Number(data.total_in).toLocaleString("fr-FR")}</span>
              <span className="text-muted-foreground">Total sorties</span>
              <span className="font-semibold text-red-600">{Number(data.total_out).toLocaleString("fr-FR")}</span>
            </div>

            {/* Current locations */}
            {data.current_locations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Emplacements actuels</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emplacement</TableHead>
                      <TableHead className="text-right">Quantite</TableHead>
                      <TableHead className="text-right">Reserve</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.current_locations.map((loc) => (
                      <TableRow key={loc.location_id}>
                        <TableCell>{loc.location_name || "-"}</TableCell>
                        <TableCell className="text-right">{Number(loc.quantity).toLocaleString("fr-FR")}</TableCell>
                        <TableCell className="text-right">{Number(loc.reserved_quantity).toLocaleString("fr-FR")}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {(Number(loc.quantity) - Number(loc.reserved_quantity)).toLocaleString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Movement history */}
            <div>
              <h4 className="text-sm font-medium mb-2">Historique des mouvements ({data.movements.length})</h4>
              {data.movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun mouvement</p>
              ) : (
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
                    {data.movements.map((m) => (
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
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Impossible de charger la tracabilite</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
