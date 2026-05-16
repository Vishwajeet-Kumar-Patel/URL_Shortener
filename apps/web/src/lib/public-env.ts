const readRequired = (name: "NEXT_PUBLIC_API_BASE_URL" | "NEXT_PUBLIC_APP_URL", value?: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const getApiBaseUrl = (): string => {
  const base = readRequired("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL);
  // Ensure no trailing slash
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  
  // Log for debugging in development/browser
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.log("[Config] API Base URL:", normalized);
  }

  return normalized;
};

export const getAppPublicUrl = (): string =>
  readRequired("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL);
