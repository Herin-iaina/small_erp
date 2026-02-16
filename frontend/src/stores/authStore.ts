import { create } from "zustand";
import type { UserMe } from "@/types/user";
import { fetchMe, login as loginApi, logout as logoutApi } from "@/services/auth";
import { getCompany } from "@/services/companies";
import type { LoginRequest } from "@/types/auth";

interface AuthState {
  user: UserMe | null;
  companyCurrency: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

async function fetchCompanyCurrency(companyId: number | null | undefined): Promise<string> {
  if (!companyId) return "EUR";
  try {
    const company = await getCompany(companyId);
    return company.currency || "EUR";
  } catch {
    return "EUR";
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  companyCurrency: "EUR",
  isAuthenticated: !!localStorage.getItem("access_token"),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      await loginApi(credentials);
      const user = await fetchMe();
      const companyCurrency = await fetchCompanyCurrency(user.company_id);
      set({ user, companyCurrency, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    set({ user: null, companyCurrency: "EUR", isAuthenticated: false });
    logoutApi();
  },

  loadUser: async () => {
    if (!localStorage.getItem("access_token")) return;
    set({ isLoading: true });
    try {
      const user = await fetchMe();
      const companyCurrency = await fetchCompanyCurrency(user.company_id);
      set({ user, companyCurrency, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, companyCurrency: "EUR", isAuthenticated: false, isLoading: false });
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  },
}));
