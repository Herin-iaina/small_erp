import { useEffect, useState } from "react";
import api from "@/services/api";
import type { User } from "@/types/user";
import type { PaginatedResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PaginatedResponse<User>>("/users")
      .then(({ data }) => {
        setUsers(data.items);
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
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <span className="text-sm text-muted-foreground">{total} au total</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Nom</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">PIN</th>
                  <th className="pb-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.role?.label ?? "-"}</td>
                    <td className="py-2">{u.has_pin ? "Oui" : "Non"}</td>
                    <td className="py-2">
                      <span
                        className={
                          u.is_active
                            ? "text-green-600"
                            : "text-red-500"
                        }
                      >
                        {u.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
