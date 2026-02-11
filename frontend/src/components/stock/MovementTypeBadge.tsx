import { Badge } from "@/components/ui/badge";

const typeConfig: Record<string, { label: string; className: string }> = {
  in: { label: "Entree", className: "bg-green-600 hover:bg-green-700 text-white" },
  out: { label: "Sortie", className: "bg-red-600 hover:bg-red-700 text-white" },
  transfer: { label: "Transfert", className: "bg-blue-600 hover:bg-blue-700 text-white" },
  adjustment: { label: "Ajustement", className: "bg-orange-500 hover:bg-orange-600 text-white" },
};

export function MovementTypeBadge({ type }: { type: string }) {
  const config = typeConfig[type] || { label: type, className: "" };
  return <Badge className={config.className}>{config.label}</Badge>;
}
