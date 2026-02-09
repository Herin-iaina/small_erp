import { useEffect, useState } from "react";
import api from "@/services/api";
import type { Company } from "@/types/company";
import type { PaginatedResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PaginatedResponse<Company>>("/companies")
      .then(({ data }) => {
        setCompanies(data.items);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Societes</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              {c.city && <div>{c.city}, {c.country}</div>}
              {c.email && <div>{c.email}</div>}
              <div>Devise : {c.currency}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
