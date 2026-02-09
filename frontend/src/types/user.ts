export interface Role {
  id: number;
  name: string;
  label: string;
  permissions: string[];
  is_superadmin: boolean;
  multi_company: boolean;
  is_system: boolean;
  company_id: number | null;
}

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
