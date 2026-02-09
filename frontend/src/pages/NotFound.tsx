import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">Page introuvable</p>
      <Button asChild className="mt-6">
        <Link to="/">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
