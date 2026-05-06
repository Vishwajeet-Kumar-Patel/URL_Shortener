"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

type OAuthPayload = {
  user: {
    userId: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "ADVERTISER";
    isEmailVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

function GoogleCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const payload = useMemo(() => params.get("payload"), [params]);
  const error = useMemo(() => params.get("error"), [params]);

  useEffect(() => {
    if (error) {
      router.replace("/login?error=google_auth_failed");
      return;
    }

    if (!payload) {
      router.replace("/login?error=google_auth_invalid_payload");
      return;
    }

    try {
      const parsed = JSON.parse(payload) as OAuthPayload;
      setSession(parsed);
      router.replace(parsed.user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch {
      router.replace("/login?error=google_auth_invalid_payload");
    }
  }, [error, payload, router, setSession]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6 text-center">
      <p className="text-slate-600">Completing Google sign-in...</p>
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6"><p className="text-slate-400">Loading...</p></div>}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
