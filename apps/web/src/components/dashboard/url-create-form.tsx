"use client";

import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import {
  formButtonPrimaryClass,
  formInputClass,
  formLabelClass
} from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

type CreatedUrl = {
  shortUrl: string;
  shortCode: string;
};

export const UrlCreateForm = ({ onCreated }: { onCreated: () => Promise<void> }) => {
  const token = useAuthStore((state) => state.accessToken);
  const [created, setCreated] = useState<CreatedUrl | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">Create short URL</h2>
        <p className="text-sm text-slate-300">Sign in as a member to generate links and track earnings.</p>
        <Link className="mt-4 inline-flex rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300" href="/login">
          Login to shorten
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setError(null);
    setCreated(null);

    const formData = new FormData(form);
    const originalUrl = String(formData.get("originalUrl") ?? "").trim();
    if (!originalUrl) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<CreatedUrl>("/urls", {
        method: "POST",
        token,
        body: { originalUrl }
      });
      setCreated(data);
      await onCreated();
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <h2 className="mb-1 text-lg font-semibold text-white">Create short URL</h2>
      <p className="mb-4 text-sm text-slate-300">Paste any long URL and generate a shareable link.</p>
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <div className="min-w-0 flex-1">
          <label className={formLabelClass} htmlFor="dash-new-url">
            Destination URL
          </label>
          <input
            className={formInputClass}
            id="dash-new-url"
            name="originalUrl"
            placeholder="https://example.com/your-long-path"
            required
            type="url"
          />
        </div>
        <button
          className={`${formButtonPrimaryClass} shrink-0 sm:mt-0 sm:w-auto sm:min-w-[8.5rem]`}
          disabled={loading}
          type="submit"
        >
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {created ? (
        <div className="mt-3 rounded border border-emerald-700 bg-emerald-950/30 p-3 text-sm">
          <p className="font-medium text-emerald-300">Short URL created</p>
          <p className="mb-2 break-all text-emerald-100">{created.shortUrl}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              onClick={() => navigator.clipboard.writeText(created.shortUrl)}
              type="button"
            >
              Copy URL
            </button>
            <a
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              href={created.shortUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open in new tab
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
};
