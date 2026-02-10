import { useState, useEffect } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { resetUserPassword } from "@/services/users";
import type { User } from "@/types/user";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewPassword("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user) return;
    if (newPassword.length < 8) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 8 caracteres",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await resetUserPassword(user.id, newPassword);
      toast({ title: "Mot de passe reinitialise" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la reinitialisation";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reinitialiser le mot de passe"
      description={
        user
          ? `Definir un nouveau mot de passe pour ${user.first_name} ${user.last_name}`
          : ""
      }
      onSubmit={handleSubmit}
      submitLabel="Reinitialiser"
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 caracteres"
            minLength={8}
            required
          />
        </div>
      </div>
    </FormDialog>
  );
}
