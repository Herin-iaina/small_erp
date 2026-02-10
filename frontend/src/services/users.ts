import api from "./api";
import type { User } from "@/types/user";
import type { PaginatedResponse } from "@/types/api";

export interface UserListParams {
  [key: string]: unknown;
  page?: number;
  page_size?: number;
  search?: string;
  company_id?: number;
  role_id?: number;
  is_active?: boolean;
}

export interface UserCreateData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  pin?: string;
  company_id?: number;
  role_id?: number;
}

export interface UserUpdateData {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_active?: boolean;
  company_id?: number;
  role_id?: number;
}

export async function listUsers(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
  const { data } = await api.get("/users", { params });
  return data;
}

export async function getUser(id: number): Promise<User> {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function createUser(body: UserCreateData): Promise<User> {
  const { data } = await api.post("/users", body);
  return data;
}

export async function updateUser(id: number, body: UserUpdateData): Promise<User> {
  const { data } = await api.patch(`/users/${id}`, body);
  return data;
}

export async function toggleUserStatus(id: number): Promise<User> {
  const { data } = await api.post(`/users/${id}/toggle-status`);
  return data;
}

export async function resetUserPassword(id: number, newPassword: string): Promise<User> {
  const { data } = await api.post(`/users/${id}/reset-password`, { new_password: newPassword });
  return data;
}

export async function setUserPin(id: number, pin: string): Promise<User> {
  const { data } = await api.post(`/users/${id}/set-pin`, { pin });
  return data;
}
