import { useEffect, useState } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RolePermissionsTree } from "@/components/shared/RolePermissionsTree";
import { toast } from "@/hooks/use-toast";
import {
  createRole,
  updateRole,
  type RoleCreateData,
  type RoleUpdateData,
} from "@/services/roles";
import type { Role } from "@/types/role";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null; // null = create mode
  onSuccess: () => void;
}

const emptyForm = {
  name: "",
  label: "",
  permissions: [] as string[],
  multi_company: false,
};

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (role) {
        setForm({
          name: role.name,
          label: role.label,
          permissions: [...role.permissions],
          multi_company: role.multi_company,
        });
      } else {
        setForm({ ...emptyForm, permissions: [] });
      }
    }
  }, [open, role]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (role) {
        const body: RoleUpdateData = {
          name: form.name,
          label: form.label,
          permissions: form.permissions,
          multi_company: form.multi_company,
        };
        await updateRole(role.id, body);
      } else {
        const body: RoleCreateData = {
          name: form.name,
          label: form.label,
          permissions: form.permissions,
          multi_company: form.multi_company,
        };
        await createRole(body);
      }
      toast({ title: "Role enregistre" });
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le role.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={role ? "Modifier le role" : "Nouveau role"}
      description={
        role
          ? "Modifiez les informations et permissions du role."
          : "Creez un nouveau role avec ses permissions."
      }
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="sm:max-w-[700px]"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role-name">Identifiant</Label>
          <Input
            id="role-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ex: custom_manager"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role-label">Libelle</Label>
          <Input
            id="role-label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="ex: Responsable personnalise"
            required
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="role-multi-company" className="cursor-pointer">
            Acces multi-societe
          </Label>
          <Switch
            id="role-multi-company"
            checked={form.multi_company}
            onCheckedChange={(checked) =>
              setForm({ ...form, multi_company: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Permissions</Label>
          <RolePermissionsTree
            value={form.permissions}
            onChange={(permissions) => setForm({ ...form, permissions })}
          />
        </div>
      </div>
    </FormDialog>
  );
}
