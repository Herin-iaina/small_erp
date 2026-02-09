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
};

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const { can } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => can(item.permission));

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
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          return (
            <NavLink
              key={item.path}
              to={item.path}
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
      </nav>
    </aside>
  );
}
