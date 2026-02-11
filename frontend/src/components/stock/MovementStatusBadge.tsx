import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-gray-400 hover:bg-gray-500 text-white" },
  validated: { label: "Valide", className: "bg-green-600 hover:bg-green-700 text-white" },
  cancelled: { label: "Annule", className: "bg-red-600 hover:bg-red-700 text-white" },
  in_progress: { label: "En cours", className: "bg-blue-600 hover:bg-blue-700 text-white" },
};

export function MovementStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return <Badge className={config.className}>{config.label}</Badge>;
}
