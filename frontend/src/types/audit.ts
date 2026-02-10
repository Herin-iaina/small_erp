export interface AuditLog {
  id: number;
  user_id: number | null;
  user_email: string;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  company_id: number | null;
  ip_address: string | null;
  authorized_by_user_id: number | null;
  authorized_by_email: string | null;
  pin_verified: boolean | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  timestamp: string;
}
