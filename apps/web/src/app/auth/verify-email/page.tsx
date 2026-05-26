"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type VerifyResponse = {
  user: {
    userId: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "ADVERTISER";
    isEmailVerified: boolean;
  };
  tokens: { accessToken: string; refreshToken: string };
};

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const pendingEmail = useAuthStore((state) => state.pendingEmail);

  const token = useMemo(() => params.get("token"), [params]);
  const email = useMemo(() => params.get("email"), [params]);

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      setStatus("verifying");
      setMessage(null);
      try {
        const data = await apiRequest<VerifyResponse>("/auth/verify-email", {
          method: "POST",
          body: { token }
        });
        setSession(data);
        setStatus("success");
        router.replace(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      }
    };

    void run();
  }, [router, setSession, token]);

  const showEmail = email ?? pendingEmail ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10 text-center sm:px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold text-white">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          {showEmail
            ? `We sent a verification link to ${showEmail}. Open the email and click the link to continue.`
            : "We sent a verification link to your email address."}
        </p>

        {status === "verifying" ? (
          <p className="mt-4 text-sm text-slate-500">Verifying your email...</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 text-sm text-red-400">{message ?? "Verification failed."}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700" href="/auth/resend-verification">
            Resend verification email
          </Link>
          <Link className="text-sm text-blue-600 hover:text-blue-500" href="/login">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4"><p className="text-slate-500">Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
