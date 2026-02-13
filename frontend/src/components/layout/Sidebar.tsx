import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Contact,
  ShoppingCart,
  TrendingUp,
  ShoppingBag,
  Package,
  FileText,
  ScrollText,
  BarChart3,
  Warehouse,
  ArrowLeftRight,
  Layers,
  ClipboardCheck,
  FolderTree,
  Lock,
  RefreshCw,
  ScanBarcode,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useUiStore } from "@/stores/uiStore";
import { NAV_ITEMS } from "@/utils/permissions";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Contact,
  ShoppingCart,
  TrendingUp,
  ShoppingBag,
  Package,
  FileText,
  ScrollText,
  BarChart3,
  Warehouse,
  ArrowLeftRight,
  Layers,
  ClipboardCheck,
  FolderTree,
  Lock,
  RefreshCw,
  ScanBarcode,
};

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const { can } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => can(item.permission));

  // Group items by their group property
  const grouped: { group: string | undefined; items: typeof visibleItems }[] = [];
  let currentGroup: string | undefined = "__initial__";

  for (const item of visibleItems) {
    if (item.group !== currentGroup) {
      currentGroup = item.group;
      grouped.push({ group: currentGroup, items: [] });
    }
    grouped[grouped.length - 1]!.items.push(item);
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {sidebarOpen && (
          <span className="text-lg font-bold">ERP</span>
        )}
        {!sidebarOpen && (
          <span className="mx-auto text-lg font-bold">E</span>
        )}
      </div>

      <nav className="space-y-1 p-2">
        {grouped.map((section, idx) => (
          <div key={section.group ?? "top"}>
            {section.group && sidebarOpen && (
              <div className={cn("px-3 py-2", idx > 0 && "mt-4")}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.group}
                </p>
              </div>
            )}
            {section.group && !sidebarOpen && idx > 0 && (
              <div className="my-2 mx-2 border-t" />
            )}
            {section.items.map((item) => {
              const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
