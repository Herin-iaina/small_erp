import { useEffect, useState } from "react";
import { useDataFetch } from "@/hooks/useDataFetch";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import { SetPinDialog } from "@/components/users/SetPinDialog";
import { toast } from "@/hooks/use-toast";
import { listUsers, toggleUserStatus } from "@/services/users";
import type { UserListParams } from "@/services/users";
import { listRoles } from "@/services/roles";
import type { User } from "@/types/user";
import type { Role } from "@/types/role";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Power, KeyRound, Lock, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  // ----- Data fetching -----
  const {
    data: users,
    total,
    page,
    pages,
    loading,
    params,
    setParams,
    setPage,
    refresh,
  } = useDataFetch<User, UserListParams>({
    fetchFn: listUsers,
    initialParams: { page: 1, page_size: 20 },
  });

  // ----- Roles for filter -----
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    listRoles({ page_size: 100 })
      .then((res) => setRoles(res.items))
      .catch(() => {});
  }, []);

  // ----- Dialog states -----
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);

  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);

  const [setPinOpen, setSetPinOpen] = useState(false);
  const [setPinUser, setSetPinUser] = useState<User | null>(null);

  // ----- Handlers -----
  const handleCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    setTogglingUser(user);
    setConfirmOpen(true);
  };

  const confirmToggle = async () => {
    if (!togglingUser) return;
    try {
      await toggleUserStatus(togglingUser.id);
      toast({
        title: togglingUser.is_active
          ? "Utilisateur desactive"
          : "Utilisateur active",
      });
      refresh();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
      setTogglingUser(null);
    }
  };

  const handleResetPassword = (user: User) => {
    setResetPwUser(user);
    setResetPwOpen(true);
  };

  const handleSetPin = (user: User) => {
    setSetPinUser(user);
    setSetPinOpen(true);
  };

  // ----- Columns -----
  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Nom",
      render: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
      key: "email",
      label: "Email",
    },
    {
      key: "role",
      label: "Role",
      render: (row) => row.role?.label ?? "-",
    },
    {
      key: "has_pin",
      label: "PIN",
      render: (row) => (
        <Badge variant={row.has_pin ? "default" : "secondary"}>
          {row.has_pin ? "Oui" : "Non"}
        </Badge>
      ),
    },
    {
      key: "is_active",
      label: "Statut",
      render: (row) => <StatusBadge active={row.is_active} />,
    },
  ];

  // ----- Filters -----
  const filters = (
    <>
      <Select
        value={params.role_id ? String(params.role_id) : "all"}
        onValueChange={(val) =>
          setParams({
            role_id: val === "all" ? undefined : Number(val),
          } as Partial<UserListParams>)
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tous les roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={String(role.id)}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={
          params.is_active === undefined
            ? "all"
            : params.is_active
              ? "true"
              : "false"
        }
        onValueChange={(val) =>
          setParams({
            is_active:
              val === "all" ? undefined : val === "true" ? true : false,
          } as Partial<UserListParams>)
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="true">Actifs</SelectItem>
          <SelectItem value="false">Inactifs</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  // ----- Actions header -----
  const actions = (
    <Button onClick={handleCreate}>
      <Plus className="mr-2 h-4 w-4" />
      Nouvel utilisateur
    </Button>
  );

  // ----- Row actions -----
  const rowActions = (user: User) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(user)}>
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
          <Power className="mr-2 h-4 w-4" />
          {user.is_active ? "Desactiver" : "Activer"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleResetPassword(user)}>
          <Lock className="mr-2 h-4 w-4" />
          Reinitialiser MDP
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetPin(user)}>
          <KeyRound className="mr-2 h-4 w-4" />
          Definir PIN
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      {/* DataTable */}
      <DataTable<User>
        columns={columns}
        data={users}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        searchValue={params.search ?? ""}
        onSearchChange={(val) =>
          setParams({ search: val || undefined } as Partial<UserListParams>)
        }
        searchPlaceholder="Rechercher par nom ou email..."
        filters={filters}
        actions={actions}
        rowKey={(row) => row.id}
        rowActions={rowActions}
        emptyMessage="Aucun utilisateur trouve"
      />

      {/* Create / Edit dialog */}
      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={refresh}
      />

      {/* Toggle status confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          togglingUser?.is_active
            ? "Desactiver l'utilisateur"
            : "Activer l'utilisateur"
        }
        description={
          togglingUser
            ? `Voulez-vous ${togglingUser.is_active ? "desactiver" : "activer"} ${togglingUser.first_name} ${togglingUser.last_name} ?`
            : ""
        }
        confirmLabel="Confirmer"
        onConfirm={confirmToggle}
      />

      {/* Reset password dialog */}
      <ResetPasswordDialog
        open={resetPwOpen}
        onOpenChange={setResetPwOpen}
        user={resetPwUser}
        onSuccess={refresh}
      />

      {/* Set PIN dialog */}
      <SetPinDialog
        open={setPinOpen}
        onOpenChange={setSetPinOpen}
        user={setPinUser}
        onSuccess={refresh}
      />
    </div>
  );
}
