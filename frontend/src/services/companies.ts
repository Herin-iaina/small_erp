import api from "./api";
import type { Company } from "@/types/company";
import type { PaginatedResponse } from "@/types/api";

export interface CompanyListParams {
  [key: string]: unknown;
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
}

export async function listCompanies(params: CompanyListParams = {}): Promise<PaginatedResponse<Company>> {
  const { data } = await api.get("/companies", { params });
  return data;
}

export async function getCompany(id: number): Promise<Company> {
  const { data } = await api.get(`/companies/${id}`);
  return data;
}

export async function createCompany(body: Partial<Company>): Promise<Company> {
  const { data } = await api.post("/companies", body);
  return data;
}

export async function updateCompany(id: number, body: Partial<Company>): Promise<Company> {
  const { data } = await api.patch(`/companies/${id}`, body);
  return data;
}

export async function toggleCompanyStatus(id: number): Promise<Company> {
  const { data } = await api.post(`/companies/${id}/toggle-status`);
  return data;
}
