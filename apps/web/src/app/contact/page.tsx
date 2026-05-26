"use client";

import { FormEvent, useState } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  formButtonPrimaryClass,
  formCardClass,
  formFieldGroupClass,
  formInputClass,
  formLabelClass,
  formTextareaClass
} from "@/components/ui/form-classes";
import { getApiBaseUrl } from "@/lib/public-env";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    try {
      const response = await fetch(`${getApiBaseUrl()}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });
      const payload = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to send message");
      }
      setSuccess("Thanks — we received your message.");
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10 md:px-8">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Contact us</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          We usually respond within one business day.
        </p>
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-emerald-400">{success}</p> : null}
        <form className={`mt-8 ${formCardClass}`} onSubmit={onSubmit}>
          <div className={formFieldGroupClass}>
            <div>
              <label className={formLabelClass} htmlFor="contact-name">
                Your name
              </label>
              <input autoComplete="name" className={formInputClass} id="contact-name" name="name" required />
            </div>
            <div>
              <label className={formLabelClass} htmlFor="contact-email">
                Work email
              </label>
              <input
                autoComplete="email"
                className={formInputClass}
                id="contact-email"
                name="email"
                required
                type="email"
              />
            </div>
            <div>
              <label className={formLabelClass} htmlFor="contact-message">
                How can we help?
              </label>
              <textarea
                className={formTextareaClass}
                id="contact-message"
                name="message"
                placeholder="Tell us about your use case or question."
                required
              />
            </div>
            <button className={formButtonPrimaryClass} disabled={submitting} type="submit">
              {submitting ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
