import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusBadge({
  active,
  activeLabel = "Actif",
  inactiveLabel = "Inactif",
}: StatusBadgeProps) {
  return (
    <Badge variant={active ? "default" : "secondary"} className={active ? "bg-green-600 hover:bg-green-700" : "bg-red-100 text-red-700"}>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
