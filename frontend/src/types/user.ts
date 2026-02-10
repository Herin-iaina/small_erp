import type { Role } from "@/types/role";

export type { Role };

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  has_pin: boolean;
  company_id: number | null;
  role_id: number | null;
  role: Role | null;
  created_at: string;
  updated_at: string;
}

export interface UserMe extends User {
  permissions: string[];
}
