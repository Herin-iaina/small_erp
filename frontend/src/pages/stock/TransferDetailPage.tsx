import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormDialog } from "@/components/shared/FormDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import {
  getTransfer,
  validateTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,
} from "@/services/stock";
import type { StockTransfer } from "@/types/stock";

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  validated: "Valide",
  in_transit: "En transit",
  received: "Recu",
  cancelled: "Annule",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  validated: "bg-blue-100 text-blue-800",
  in_transit: "bg-yellow-100 text-yellow-800",
  received: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(true);

  // Ship dialog
  const [shipOpen, setShipOpen] = useState(false);
  const [shipLoading, setShipLoading] = useState(false);
  const [shipForm, setShipForm] = useState({ transporter: "", tracking_number: "" });

  // Receive dialog
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveLines, setReceiveLines] = useState<{ line_id: number; quantity_received: number }[]>([]);

  // Confirm dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"validate" | "cancel" | null>(null);

  const loadTransfer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTransfer(Number(id));
      setTransfer(data);
    } catch {
      toast({ title: "Erreur", description: "Transfert introuvable", variant: "destructive" });
      navigate("/stock/transfers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfer();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmAction = (action: "validate" | "cancel") => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const executeConfirm = async () => {
    if (!transfer || !confirmAction) return;
    try {
      if (confirmAction === "validate") {
        await validateTransfer(transfer.id);
        toast({ title: "Transfert valide" });
      } else {
        await cancelTransfer(transfer.id);
        toast({ title: "Transfert annule" });
      }
      await loadTransfer();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleShip = async () => {
    if (!transfer) return;
    setShipLoading(true);
    try {
      await shipTransfer(transfer.id, {
        transporter: shipForm.transporter || undefined,
        tracking_number: shipForm.tracking_number || undefined,
      });
      toast({ title: "Transfert expedie" });
      setShipOpen(false);
      await loadTransfer();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setShipLoading(false);
    }
  };

  const openReceiveDialog = () => {
    if (!transfer) return;
    setReceiveLines(
      transfer.lines.map((l) => ({
        line_id: l.id,
        quantity_received: l.quantity_sent,
      }))
    );
    setReceiveOpen(true);
  };

  const handleReceive = async () => {
    if (!transfer) return;
    setReceiveLoading(true);
    try {
      await receiveTransfer(transfer.id, { lines: receiveLines });
      toast({ title: "Transfert recu" });
      setReceiveOpen(false);
      await loadTransfer();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setReceiveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!transfer) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stock/transfers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Transfert {transfer.reference}</h1>
          <p className="text-muted-foreground">
            {transfer.source_warehouse?.name} → {transfer.destination_warehouse?.name}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className={statusColors[transfer.status] || ""}>
            {statusLabels[transfer.status] || transfer.status}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {transfer.status === "draft" && (
          <>
            <Button onClick={() => handleConfirmAction("validate")}>Valider</Button>
            <Button variant="destructive" onClick={() => handleConfirmAction("cancel")}>Annuler</Button>
          </>
        )}
        {transfer.status === "validated" && (
          <>
            <Button onClick={() => { setShipForm({ transporter: transfer.transporter || "", tracking_number: transfer.tracking_number || "" }); setShipOpen(true); }}>
              Expedier
            </Button>
            <Button variant="destructive" onClick={() => handleConfirmAction("cancel")}>Annuler</Button>
          </>
        )}
        {transfer.status === "in_transit" && (
          <>
            <Button onClick={openReceiveDialog}>Recevoir</Button>
            <Button variant="destructive" onClick={() => handleConfirmAction("cancel")}>Annuler</Button>
          </>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Date transfert</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{new Date(transfer.transfer_date).toLocaleDateString("fr-FR")}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Arrivee prevue</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{transfer.expected_arrival_date ? new Date(transfer.expected_arrival_date).toLocaleDateString("fr-FR") : "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Transporteur</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{transfer.transporter || "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">N° suivi</CardTitle></CardHeader>
          <CardContent><p className="font-semibold font-mono">{transfer.tracking_number || "-"}</p></CardContent>
        </Card>
      </div>

      {/* Lines table */}
      <Card>
        <CardHeader>
          <CardTitle>Lignes ({transfer.lines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead className="text-right">Qte envoyee</TableHead>
                <TableHead className="text-right">Qte recue</TableHead>
                <TableHead className="text-right">Ecart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfer.lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">Aucune ligne</TableCell>
                </TableRow>
              ) : (
                transfer.lines.map((line) => {
                  const diff = line.quantity_received != null ? line.quantity_received - line.quantity_sent : null;
                  return (
                    <TableRow key={line.id}>
                      <TableCell>{line.product ? `${line.product.sku} - ${line.product.name}` : `#${line.product_id}`}</TableCell>
                      <TableCell>{line.lot?.lot_number || "-"}</TableCell>
                      <TableCell className="text-right">{Number(line.quantity_sent).toFixed(3)}</TableCell>
                      <TableCell className="text-right">{line.quantity_received != null ? Number(line.quantity_received).toFixed(3) : "-"}</TableCell>
                      <TableCell className={`text-right ${diff && diff < 0 ? "text-red-600 font-semibold" : ""}`}>
                        {diff != null ? (diff > 0 ? "+" : "") + diff.toFixed(3) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {transfer.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">{transfer.notes}</p></CardContent>
        </Card>
      )}

      {/* Ship Dialog */}
      <FormDialog
        open={shipOpen}
        onOpenChange={setShipOpen}
        title="Expedier le transfert"
        onSubmit={handleShip}
        loading={shipLoading}
        submitLabel="Expedier"
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Transporteur</Label>
            <Input value={shipForm.transporter} onChange={(e) => setShipForm((p) => ({ ...p, transporter: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Numero de suivi</Label>
            <Input value={shipForm.tracking_number} onChange={(e) => setShipForm((p) => ({ ...p, tracking_number: e.target.value }))} />
          </div>
        </div>
      </FormDialog>

      {/* Receive Dialog */}
      <FormDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title="Recevoir le transfert"
        onSubmit={handleReceive}
        loading={receiveLoading}
        submitLabel="Confirmer reception"
        maxWidth="sm:max-w-[600px]"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Saisissez les quantites recues pour chaque ligne :</p>
          {receiveLines.map((rl, idx) => {
            const line = transfer.lines.find((l) => l.id === rl.line_id);
            return (
              <div key={rl.line_id} className="grid grid-cols-[1fr_100px] gap-4 items-center">
                <span className="text-sm">
                  {line?.product ? `${line.product.sku} - ${line.product.name}` : `Ligne #${rl.line_id}`}
                  <span className="text-muted-foreground ml-2">(envoye: {line ? Number(line.quantity_sent).toFixed(3) : "?"})</span>
                </span>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={rl.quantity_received}
                  onChange={(e) => {
                    setReceiveLines((prev) => prev.map((r, i) => i === idx ? { ...r, quantity_received: Number(e.target.value) } : r));
                  }}
                />
              </div>
            );
          })}
        </div>
      </FormDialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction === "validate" ? "Valider le transfert ?" : "Annuler le transfert ?"}
        description={
          confirmAction === "validate"
            ? "Le stock sera decremente a l'entrepot source."
            : "Le transfert sera annule. Le stock source sera restaure si necessaire."
        }
        confirmLabel={confirmAction === "validate" ? "Valider" : "Annuler le transfert"}
        variant={confirmAction === "cancel" ? "destructive" : "default"}
        onConfirm={executeConfirm}
      />
    </div>
  );
}
