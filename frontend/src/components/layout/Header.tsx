import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/uiStore";

export function Header() {
  const { user, logout } = useAuth();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4"
      style={{ marginLeft: sidebarOpen ? "16rem" : "4rem" }}
    >
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <div className="font-medium">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.role?.label ?? "Sans role"}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            <User className="h-4 w-4" />
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Deconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
