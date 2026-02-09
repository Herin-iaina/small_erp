import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useUiStore } from "@/stores/uiStore";

export function MainLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main
        className="transition-all duration-300 p-6"
        style={{ marginLeft: sidebarOpen ? "16rem" : "4rem" }}
      >
        <Outlet />
      </main>
    </div>
  );
}
