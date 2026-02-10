import { useState, useEffect } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { setUserPin } from "@/services/users";
import type { User } from "@/types/user";

interface SetPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export function SetPinDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: SetPinDialogProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
    }
  }, [open]);

  const handlePinChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, "");
    setPin(digits);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (pin.length < 4 || pin.length > 6) {
      toast({
        title: "Erreur",
        description: "Le code PIN doit contenir entre 4 et 6 chiffres",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await setUserPin(user.id, pin);
      toast({ title: "Code PIN defini" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la definition du PIN";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Definir le code PIN"
      description={
        user
          ? `Definir un code PIN pour ${user.first_name} ${user.last_name}`
          : ""
      }
      onSubmit={handleSubmit}
      submitLabel="Definir"
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pin-input">Code PIN</Label>
          <Input
            id="pin-input"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="4 a 6 chiffres"
            maxLength={6}
            inputMode="numeric"
            pattern="[0-9]*"
            required
          />
          <p className="text-xs text-muted-foreground">
            Le code PIN doit contenir entre 4 et 6 chiffres
          </p>
        </div>
      </div>
    </FormDialog>
  );
}
