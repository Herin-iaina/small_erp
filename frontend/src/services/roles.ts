import api from "./api";
import type { Role } from "@/types/role";
import type { PaginatedResponse } from "@/types/api";

export interface RoleListParams {
  [key: string]: unknown;
  page?: number;
  page_size?: number;
  company_id?: number;
}

export interface RoleCreateData {
  name: string;
  label: string;
  permissions: string[];
  is_superadmin?: boolean;
  multi_company?: boolean;
  company_id?: number;
}

export interface RoleUpdateData {
  name?: string;
  label?: string;
  permissions?: string[];
  multi_company?: boolean;
}

export async function listRoles(params: RoleListParams = {}): Promise<PaginatedResponse<Role>> {
  const { data } = await api.get("/roles", { params });
  return data;
}

export async function getRole(id: number): Promise<Role> {
  const { data } = await api.get(`/roles/${id}`);
  return data;
}

export async function createRole(body: RoleCreateData): Promise<Role> {
  const { data } = await api.post("/roles", body);
  return data;
}

export async function updateRole(id: number, body: RoleUpdateData): Promise<Role> {
  const { data } = await api.patch(`/roles/${id}`, body);
  return data;
}

export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/roles/${id}`);
}

export async function getAvailablePermissions(): Promise<string[]> {
  const { data } = await api.get("/roles/available-permissions");
  return data.permissions;
}
