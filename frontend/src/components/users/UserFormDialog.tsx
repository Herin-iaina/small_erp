import { useState, useEffect, useMemo } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RolePermissionsTree } from "@/components/shared/RolePermissionsTree";
import { toast } from "@/hooks/use-toast";
import { createUser, updateUser } from "@/services/users";
import type { UserCreateData, UserUpdateData } from "@/services/users";
import { listRoles } from "@/services/roles";
import { listCompanies } from "@/services/companies";
import type { User } from "@/types/user";
import type { Role } from "@/types/role";
import type { Company } from "@/types/company";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null; // null = create mode
  onSuccess: () => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  pin: string;
  role_id: string;
  company_id: string;
}

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  pin: "",
  role_id: "",
  company_id: "",
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const isEdit = user !== null;

  // Load roles and companies on mount
  useEffect(() => {
    listRoles({ page_size: 100 })
      .then((res) => setRoles(res.items))
      .catch(() => {});
    listCompanies({ page_size: 100 })
      .then((res) => setCompanies(res.items))
      .catch(() => {});
  }, []);

  // Initialize form when dialog opens or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        setForm({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone ?? "",
          password: "",
          pin: "",
          role_id: user.role_id ? String(user.role_id) : "",
          company_id: user.company_id ? String(user.company_id) : "",
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, user]);

  const selectedRole = useMemo(() => {
    if (!form.role_id) return null;
    return roles.find((r) => r.id === Number(form.role_id)) ?? null;
  }, [roles, form.role_id]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      toast({
        title: "Erreur",
        description: "Les champs nom, prenom et email sont obligatoires",
        variant: "destructive",
      });
      return;
    }
    if (!isEdit && !form.password) {
      toast({
        title: "Erreur",
        description: "Le mot de passe est obligatoire pour un nouvel utilisateur",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const body: UserUpdateData = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone || undefined,
          role_id: form.role_id ? Number(form.role_id) : undefined,
          company_id: form.company_id ? Number(form.company_id) : undefined,
        };
        await updateUser(user.id, body);
        toast({ title: "Utilisateur modifie" });
      } else {
        const body: UserCreateData = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          pin: form.pin || undefined,
          role_id: form.role_id ? Number(form.role_id) : undefined,
          company_id: form.company_id ? Number(form.company_id) : undefined,
        };
        await createUser(body);
        toast({ title: "Utilisateur cree" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="sm:max-w-[600px]"
    >
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="auth">Authentification</TabsTrigger>
          <TabsTrigger value="role">Role</TabsTrigger>
          <TabsTrigger value="company">Societe</TabsTrigger>
        </TabsList>

        {/* Tab: Informations */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prenom *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
                placeholder="Prenom"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
                placeholder="Nom"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="adresse@exemple.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telephone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="Telephone"
            />
          </div>
        </TabsContent>

        {/* Tab: Authentification */}
        <TabsContent value="auth" className="space-y-4 mt-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Minimum 8 caracteres"
                minLength={8}
                required
              />
            </div>
          )}
          {isEdit && (
            <p className="text-sm text-muted-foreground">
              Pour reinitialiser le mot de passe, utilisez l'action dediee depuis la
              liste des utilisateurs.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="pin">Code PIN</Label>
            <Input
              id="pin"
              value={form.pin}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                updateField("pin", digits);
              }}
              placeholder="4 a 6 chiffres"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <p className="text-xs text-muted-foreground">
              Le code PIN est utilise pour les validations en caisse
            </p>
          </div>
        </TabsContent>

        {/* Tab: Role */}
        <TabsContent value="role" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.role_id}
              onValueChange={(val) => updateField("role_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRole && (
            <div className="space-y-2">
              <Label>Permissions du role</Label>
              <RolePermissionsTree
                value={selectedRole.permissions}
                readOnly
              />
            </div>
          )}
        </TabsContent>

        {/* Tab: Societe */}
        <TabsContent value="company" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Societe</Label>
            <Select
              value={form.company_id}
              onValueChange={(val) => updateField("company_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner une societe" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </FormDialog>
  );
}
