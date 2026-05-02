"use client";

import { create } from "zustand";
import { apiRequest } from "@/lib/api-client";

import { AuthUser, AuthResponse, RegisterResponse } from "@/types/auth";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingEmail: string | null;
  isHydrated: boolean;
  hydrate: () => void;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string; referralCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (payload: AuthResponse) => void;
  patchUser: (partial: Partial<Pick<AuthUser, "name" | "email">>) => void;
};

const ACCESS_KEY = "ls_access_token";
const REFRESH_KEY = "ls_refresh_token";
const USER_KEY = "ls_user";
const PENDING_EMAIL_KEY = "ls_pending_email";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  pendingEmail: null,
  isHydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    const accessToken = localStorage.getItem(ACCESS_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    const pendingEmail = localStorage.getItem(PENDING_EMAIL_KEY);
    set({ accessToken, refreshToken, user, pendingEmail, isHydrated: true });
  },
  login: async ({ email, password }) => {
    const data = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password }
    });

    const user: AuthUser = {
      id: data.user.userId,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      isEmailVerified: data.user.isEmailVerified
    };

    localStorage.setItem(ACCESS_KEY, data.tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, data.tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(PENDING_EMAIL_KEY);
    set({
      user,
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
      pendingEmail: null
    });
  },
  register: async ({ name, email, password, referralCode }) => {
    const data = await apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      body: {
        name,
        email,
        password,
        ...(referralCode ? { referralCode } : {})
      }
    });

    if (data.verificationRequired) {
      localStorage.setItem(PENDING_EMAIL_KEY, data.user.email);
      set({ pendingEmail: data.user.email });
      return;
    }
  },
  logout: async () => {
    const { accessToken, refreshToken } = get();
    if (accessToken && refreshToken) {
      try {
        await apiRequest<null>("/auth/logout", {
          method: "POST",
          token: accessToken,
          body: { refreshToken }
        });
      } catch {
        // no-op
      }
    }

    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PENDING_EMAIL_KEY);
    set({ user: null, accessToken: null, refreshToken: null, pendingEmail: null });
  },
  setSession: (payload) => {
    const user: AuthUser = {
      id: payload.user.userId,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
      isEmailVerified: payload.user.isEmailVerified
    };

    localStorage.setItem(ACCESS_KEY, payload.tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, payload.tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(PENDING_EMAIL_KEY);
    set({
      user,
      accessToken: payload.tokens.accessToken,
      refreshToken: payload.tokens.refreshToken,
      pendingEmail: null
    });
  },
  patchUser: (partial) => {
    const cur = get().user;
    if (!cur || typeof window === "undefined") return;
    const next = { ...cur, ...partial };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    set({ user: next });
  }
}));
