"use client";

import { FormEvent, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import {
  formButtonPrimaryClass,
  formCardClass,
  formFieldGroupClass,
  formInputClass,
  formLabelClass
} from "@/components/ui/form-classes";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("Reset token is missing.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      await apiRequest<null>("/auth/reset-password", {
        method: "POST",
        body: { token, password }
      });
      setStatus("done");
      setMessage("Password reset successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to reset password");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10 sm:px-6">
      <div className={`w-full text-left ${formCardClass}`}>
        <h1 className="text-2xl font-semibold text-white">Reset password</h1>
        <p className="mt-2 text-sm text-slate-300">Enter a new password for your account.</p>

        <form className={`mt-6 ${formFieldGroupClass}`} onSubmit={handleSubmit}>
          <div>
            <label className={formLabelClass} htmlFor="reset-password">
              New password
            </label>
            <input
              autoComplete="new-password"
              className={formInputClass}
              id="reset-password"
              name="password"
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="reset-confirm">
              Confirm password
            </label>
            <input
              autoComplete="new-password"
              className={formInputClass}
              id="reset-confirm"
              name="confirm"
              type="password"
              minLength={8}
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <button className={formButtonPrimaryClass} disabled={status === "loading"} type="submit">
            {status === "loading" ? "Updating..." : "Update password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4"><p className="text-slate-400">Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
