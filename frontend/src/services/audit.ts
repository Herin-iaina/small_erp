import api from "./api";
import type { AuditLog } from "@/types/audit";
import type { PaginatedResponse } from "@/types/api";

export interface AuditLogListParams {
  [key: string]: unknown;
  page?: number;
  page_size?: number;
  user_id?: number;
  action?: string;
  module?: string;
  date_from?: string;
  date_to?: string;
}

export async function listAuditLogs(params: AuditLogListParams = {}): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await api.get("/audit-logs", { params });
  return data;
}
