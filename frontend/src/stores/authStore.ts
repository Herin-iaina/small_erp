import { create } from "zustand";
import type { UserMe } from "@/types/user";
import { fetchMe, login as loginApi, logout as logoutApi } from "@/services/auth";
import type { LoginRequest } from "@/types/auth";

interface AuthState {
  user: UserMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      await loginApi(credentials);
      const user = await fetchMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    logoutApi();
  },

  loadUser: async () => {
    if (!localStorage.getItem("access_token")) return;
    set({ isLoading: true });
    try {
      const user = await fetchMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  },
}));
