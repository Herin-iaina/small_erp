/**
 * Navigation items filtered by role/permissions.
 */

export interface NavItem {
  label: string;
  path: string;
  icon: string; // lucide icon name
  permission: string; // required permission
  group?: string; // sidebar section group
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", path: "/", icon: "LayoutDashboard", permission: "admin.view" },
  // Administration group
  { label: "Societes", path: "/companies", icon: "Building2", permission: "admin.view", group: "Administration" },
  { label: "Utilisateurs", path: "/users", icon: "Users", permission: "admin.view", group: "Administration" },
  { label: "Roles", path: "/roles", icon: "Shield", permission: "admin.view", group: "Administration" },
  { label: "Journal d'audit", path: "/audit-logs", icon: "ScrollText", permission: "admin.view", group: "Administration" },
  // Business
  { label: "Tiers", path: "/third-parties", icon: "Contact", permission: "third_party.view" },
  // Stock module
  { label: "Tableau de bord", path: "/stock", icon: "BarChart3", permission: "stock.view", group: "Stock" },
  { label: "Categories", path: "/stock/categories", icon: "FolderTree", permission: "stock.view", group: "Stock" },
  { label: "Articles", path: "/stock/products", icon: "Package", permission: "stock.view", group: "Stock" },
  { label: "Entrepots", path: "/stock/warehouses", icon: "Warehouse", permission: "stock.view", group: "Stock" },
  { label: "Mouvements", path: "/stock/movements", icon: "ArrowLeftRight", permission: "stock.view", group: "Stock" },
  { label: "Lots", path: "/stock/lots", icon: "Layers", permission: "stock.view", group: "Stock" },
  { label: "Inventaires", path: "/stock/inventories", icon: "ClipboardCheck", permission: "stock.view", group: "Stock" },
  { label: "Reservations", path: "/stock/reservations", icon: "Lock", permission: "stock.view", group: "Stock" },
  { label: "Reappro.", path: "/stock/replenishment", icon: "RefreshCw", permission: "stock.view", group: "Stock" },
  { label: "Transferts", path: "/stock/transfers", icon: "Truck", permission: "stock.view", group: "Stock" },
  { label: "Cycles inventaire", path: "/stock/cycles", icon: "RotateCw", permission: "stock.view", group: "Stock" },
  { label: "Unites", path: "/stock/units", icon: "Ruler", permission: "stock.view", group: "Stock" },
  { label: "Scanner", path: "/stock/barcode-scanner", icon: "ScanBarcode", permission: "stock.view", group: "Stock" },
  // Future modules:
  { label: "Point de vente", path: "/pos", icon: "ShoppingCart", permission: "pos.view" },
  { label: "Ventes", path: "/sales", icon: "TrendingUp", permission: "sales.view" },
  { label: "Achats", path: "/purchases", icon: "ShoppingBag", permission: "purchase.view" },
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
