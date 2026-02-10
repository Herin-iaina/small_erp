export interface Role {
  id: number;
  name: string;
  label: string;
  permissions: string[];
  is_superadmin: boolean;
  multi_company: boolean;
  is_system: boolean;
  company_id: number | null;
  user_count: number;
  created_at: string;
  updated_at: string;
}
