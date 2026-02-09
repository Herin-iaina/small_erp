/**
 * Navigation items filtered by role/permissions.
 */

export interface NavItem {
  label: string;
  path: string;
  icon: string; // lucide icon name
  permission: string; // required permission
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", path: "/", icon: "LayoutDashboard", permission: "admin.view" },
  { label: "Societes", path: "/companies", icon: "Building2", permission: "admin.view" },
  { label: "Utilisateurs", path: "/users", icon: "Users", permission: "admin.view" },
  { label: "Roles", path: "/roles", icon: "Shield", permission: "admin.view" },
  { label: "Tiers", path: "/third-parties", icon: "Contact", permission: "third_party.view" },
  // Future modules:
  { label: "Point de vente", path: "/pos", icon: "ShoppingCart", permission: "pos.view" },
  { label: "Ventes", path: "/sales", icon: "TrendingUp", permission: "sales.view" },
  { label: "Achats", path: "/purchases", icon: "ShoppingBag", permission: "purchase.view" },
  { label: "Stock", path: "/stock", icon: "Package", permission: "stock.view" },
  { label: "Facturation", path: "/invoicing", icon: "FileText", permission: "invoicing.view" },
];

export function filterNavByPermissions(
  permissions: string[]
): NavItem[] {
  if (permissions.includes("*.*")) return NAV_ITEMS;

  return NAV_ITEMS.filter((item) => {
    const [reqModule, reqAction] = item.permission.split(".");
    return permissions.some((perm) => {
      const [pModule, pAction] = perm.split(".");
      if (pModule === "*" || pModule === reqModule) {
        if (pAction === "*" || pAction === reqAction) return true;
      }
      return false;
    });
  });
}
