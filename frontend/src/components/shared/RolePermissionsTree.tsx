import { Checkbox } from "@/components/ui/checkbox";

const MODULE_LABELS: Record<string, string> = {
  pos: "Point de Vente",
  stock: "Stock",
  sales: "Ventes",
  purchase: "Achats",
  invoicing: "Facturation",
  mrp: "Production",
  accounting: "Comptabilite",
  admin: "Administration",
  third_party: "Tiers",
};

const ACTION_LABELS: Record<string, string> = {
  view: "Voir",
  create: "Creer",
  edit: "Modifier",
  delete: "Supprimer",
  validate: "Valider",
  export: "Exporter",
};

interface RolePermissionsTreeProps {
  value: string[];
  onChange?: (permissions: string[]) => void;
  readOnly?: boolean;
}

export function RolePermissionsTree({
  value,
  onChange,
  readOnly = false,
}: RolePermissionsTreeProps) {
  const modules = Object.keys(MODULE_LABELS);
  const actions = Object.keys(ACTION_LABELS);

  const hasPermission = (perm: string) => {
    if (value.includes("*.*")) return true;
    const [mod] = perm.split(".");
    return value.includes(perm) || value.includes(`${mod}.*`);
  };

  const togglePermission = (perm: string) => {
    if (readOnly || !onChange) return;
    const newPerms = hasPermission(perm)
      ? value.filter((p) => p !== perm && p !== `${perm.split(".")[0]}.*`)
      : [...value, perm];
    onChange(newPerms);
  };

  const toggleModule = (mod: string) => {
    if (readOnly || !onChange) return;
    const moduleWildcard = `${mod}.*`;
    if (value.includes(moduleWildcard)) {
      onChange(value.filter((p) => p !== moduleWildcard && !p.startsWith(`${mod}.`)));
    } else {
      // Remove individual permissions, add wildcard
      const filtered = value.filter((p) => !p.startsWith(`${mod}.`));
      onChange([...filtered, moduleWildcard]);
    }
  };

  const isModuleFullyChecked = (mod: string) => {
    return value.includes("*.*") || value.includes(`${mod}.*`);
  };

  const isModulePartiallyChecked = (mod: string) => {
    if (isModuleFullyChecked(mod)) return false;
    return actions.some((action) => value.includes(`${mod}.${action}`));
  };

  if (value.includes("*.*")) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        Super Administrateur — Acces total a toutes les permissions
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((mod) => (
        <div key={mod} className="rounded-md border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id={`module-${mod}`}
              checked={isModuleFullyChecked(mod)}
              ref={(el) => {
                if (el) {
                  (el as unknown as HTMLButtonElement).dataset.state =
                    isModulePartiallyChecked(mod) ? "indeterminate" :
                    isModuleFullyChecked(mod) ? "checked" : "unchecked";
                }
              }}
              onCheckedChange={() => toggleModule(mod)}
              disabled={readOnly}
            />
            <label
              htmlFor={`module-${mod}`}
              className="text-sm font-semibold cursor-pointer"
            >
              {MODULE_LABELS[mod]}
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 ml-6">
            {actions.map((action) => {
              const perm = `${mod}.${action}`;
              return (
                <div key={perm} className="flex items-center gap-2">
                  <Checkbox
                    id={`perm-${perm}`}
                    checked={hasPermission(perm)}
                    onCheckedChange={() => togglePermission(perm)}
                    disabled={readOnly || isModuleFullyChecked(mod)}
                  />
                  <label
                    htmlFor={`perm-${perm}`}
                    className="text-sm cursor-pointer"
                  >
                    {ACTION_LABELS[action]}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
