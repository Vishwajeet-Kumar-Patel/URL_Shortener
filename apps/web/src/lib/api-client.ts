"use client";

import { getApiBaseUrl } from "./public-env";

export const API_BASE_URL = getApiBaseUrl();

let authRedirectInProgress = false;

const handleAuthFailureRedirect = () => {
  if (typeof window === "undefined") return;
  if (authRedirectInProgress) return;
  if (window.location.pathname === "/login") return;

  authRedirectInProgress = true;

  // Clear persisted auth state to avoid stale session loops.
  localStorage.removeItem("ls_access_token");
  localStorage.removeItem("ls_refresh_token");
  localStorage.removeItem("ls_user");

  sessionStorage.setItem("auth_redirect_reason", "expired_or_invalid");
  window.location.replace("/login?reason=expired");
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorPayload = (await response.json()) as { message?: string };
      errorMessage = errorPayload.message || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    if ((response.status === 401 || response.status === 403) && options.token) {
      handleAuthFailureRedirect();
    }

    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as { success?: boolean; data?: T; message?: string };
  
  // If response has success field and it's false, throw error
  if (payload.success === false) {
    throw new Error(payload.message ?? "Request failed");
  }

  // Return data if it exists, otherwise return payload as data
  return (payload.data ?? payload) as T;
};
