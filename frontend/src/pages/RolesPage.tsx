import { useState } from "react";
import { listRoles, deleteRole, type RoleListParams } from "@/services/roles";
import type { Role } from "@/types/role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RoleFormDialog } from "@/components/roles/RoleFormDialog";
import { toast } from "@/hooks/use-toast";
import { useDataFetch } from "@/hooks/useDataFetch";
import { Plus, Pencil, Trash2, Lock, Shield, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function RolesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const { data, loading, refresh } = useDataFetch<Role, RoleListParams>({
    fetchFn: listRoles,
    initialParams: { page: 1, page_size: 100 },
  });

  const handleCreate = () => {
    setEditingRole(null);
    setFormOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleDeleteConfirm = (role: Role) => {
    setDeletingRole(role);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    try {
      await deleteRole(deletingRole.id);
      toast({ title: "Role supprime" });
      refresh();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast({
          title: "Impossible de supprimer ce role",
          description: "Ce role est encore assigne a des utilisateurs.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Impossible de supprimer ce role",
          description: "Une erreur est survenue.",
          variant: "destructive",
        });
      }
    } finally {
      setDeleteOpen(false);
      setDeletingRole(null);
    }
  };

  if (loading && data.length === 0) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                {role.label}
              </CardTitle>
              {role.is_system ? (
                <Badge variant="outline">Systeme</Badge>
              ) : (
                <Badge variant="default">Personnalise</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{role.name}</p>

              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>
                  {role.permissions.includes("*.*")
                    ? "Acces total"
                    : `${role.permissions.length} permissions`}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{role.user_count} utilisateur(s)</span>
              </div>

              {role.is_system ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Non modifiable</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(role)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Modifier
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteConfirm(role)}
                            disabled={role.user_count > 0}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Supprimer
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {role.user_count > 0 && (
                        <TooltipContent>
                          Suppression impossible : role assigne
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editingRole}
        onSuccess={refresh}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer le role"
        description={
          deletingRole
            ? `Voulez-vous vraiment supprimer le role "${deletingRole.label}" ?`
            : ""
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
