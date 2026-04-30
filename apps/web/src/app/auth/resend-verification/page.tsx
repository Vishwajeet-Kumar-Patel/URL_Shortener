"use client";

import { FormEvent, useMemo, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import {
  formButtonPrimaryClass,
  formCardClass,
  formFieldGroupClass,
  formInputClass,
  formLabelClass
} from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

function ResendVerificationContent() {
  const params = useSearchParams();
  const pendingEmail = useAuthStore((state) => state.pendingEmail);
  const initialEmail = useMemo(() => params.get("email") ?? pendingEmail ?? "", [params, pendingEmail]);

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      await apiRequest<null>("/auth/resend-verification", {
        method: "POST",
        body: { email }
      });
      setStatus("sent");
      setMessage("Verification email sent if the account exists.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to send verification email");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10 sm:px-6">
      <div className={`w-full text-left ${formCardClass}`}>
        <h1 className="text-2xl font-semibold text-white">Resend verification email</h1>
        <p className="mt-2 text-sm text-slate-300">Enter your email to receive a fresh verification link.</p>

        <form className={`mt-6 ${formFieldGroupClass}`} onSubmit={handleSubmit} suppressHydrationWarning>
          <div>
            <label className={formLabelClass} htmlFor="resend-email">
              Email
            </label>
            <input
              autoComplete="email"
              className={formInputClass}
              id="resend-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              suppressHydrationWarning
            />
          </div>
          <button
            className={formButtonPrimaryClass}
            disabled={status === "loading"}
            type="submit"
            suppressHydrationWarning
          >
            {status === "loading" ? "Sending..." : "Send verification"}
          </button>
        </form>

        {message ? (
          <p className={`mt-3 text-sm ${status === "error" ? "text-red-400" : "text-emerald-300"}`}>{message}</p>
        ) : null}

        <div className="mt-4 text-sm">
          <Link className="text-indigo-300 hover:text-indigo-200" href="/login">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4"><p className="text-slate-400">Loading...</p></div>}>
      <ResendVerificationContent />
    </Suspense>
  );
}
