import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  Contact,
  ShoppingCart,
  TrendingUp,
  Package,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { hasModule, isSuperAdmin } = usePermissions();

  const cards = [
    {
      title: "Point de vente",
      icon: ShoppingCart,
      description: "Sessions POS actives",
      value: "-",
      visible: hasModule("pos"),
    },
    {
      title: "Ventes",
      icon: TrendingUp,
      description: "Commandes du jour",
      value: "-",
      visible: hasModule("sales"),
    },
    {
      title: "Stock",
      icon: Package,
      description: "Articles en stock",
      value: "-",
      visible: hasModule("stock"),
    },
    {
      title: "Tiers",
      icon: Contact,
      description: "Clients / Fournisseurs",
      value: "-",
      visible: hasModule("third_party"),
    },
    {
      title: "Utilisateurs",
      icon: Users,
      description: "Comptes actifs",
      value: "-",
      visible: isSuperAdmin || hasModule("admin"),
    },
    {
      title: "Societes",
      icon: Building2,
      description: "Societes actives",
      value: "-",
      visible: isSuperAdmin,
    },
  ];

  const visibleCards = cards.filter((c) => c.visible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Bonjour, {user?.first_name}
        </h1>
        <p className="text-muted-foreground">
          {user?.role?.label ?? "Utilisateur"} &mdash; Tableau de bord
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
