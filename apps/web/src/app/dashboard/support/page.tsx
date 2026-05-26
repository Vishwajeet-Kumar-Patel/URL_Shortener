"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/public-env";
import {
  formButtonPrimaryClass,
  formCardClass,
  formFieldGroupClass,
  formInputClass,
  formLabelClass,
  formTextareaClass
} from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

export default function DashboardSupportPage() {
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.email, user?.name]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });
      const payload = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to send request");
      }
      setSuccess("Thanks. Your support request was sent.");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Help desk</p>
        <h1 className="text-3xl font-semibold text-white">Support</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Reach the team directly from your dashboard. The form posts to the live contact backend.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <form className={`${formCardClass} ${formFieldGroupClass}`} onSubmit={onSubmit}>
          <div>
            <label className={formLabelClass} htmlFor="support-name">
              Your name
            </label>
            <input
              autoComplete="name"
              className={formInputClass}
              id="support-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
              required
            />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="support-email">
              Email
            </label>
            <input
              autoComplete="email"
              className={formInputClass}
              id="support-email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
              required
            />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="support-message">
              How can we help?
            </label>
            <textarea
              className={formTextareaClass}
              id="support-message"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell us what you need help with."
              value={message}
              required
            />
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
          <button className={formButtonPrimaryClass} disabled={submitting} type="submit">
            {submitting ? "Sending..." : "Send support request"}
          </button>
        </form>

        <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Fast paths</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Common options</h2>
          </div>
          <div className="grid gap-3">
            {[
              ["Manage Links", "/dashboard/urls"],
              ["Analytics", "/dashboard/analytics"],
              ["Wallet", "/dashboard/wallet"],
              ["Referrals", "/dashboard/referrals"],
              ["Billing", "/dashboard/billing"],
              ["Profile", "/dashboard/profile"]
            ].map(([label, href]) => (
              <Link
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                href={String(href)}
                key={String(label)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}