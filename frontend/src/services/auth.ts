import type { LoginRequest, TokenResponse } from "@/types/auth";
import type { UserMe } from "@/types/user";
import api from "./api";

export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/login", credentials);
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  return data;
}

export async function fetchMe(): Promise<UserMe> {
  const { data } = await api.get<UserMe>("/auth/me");
  return data;
}

export function logout(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

export async function verifyPin(
  pin: string,
  action: string,
  entityType?: string,
  entityId?: number
): Promise<boolean> {
  const { data } = await api.post("/auth/verify-pin", {
    pin,
    action,
    entity_type: entityType,
    entity_id: entityId,
  });
  return data.verified;
}
