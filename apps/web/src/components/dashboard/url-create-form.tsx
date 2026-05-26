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
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-panel sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Create short URL</h2>
        <p className="text-sm text-slate-600">Sign in as a member to generate links and track earnings.</p>
        <Link className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500" href="/login">
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel sm:p-7">
      <h2 className="mb-1 text-xl font-semibold text-slate-900">Create short URL</h2>
      <p className="mb-5 text-sm text-slate-600">Paste any long URL and generate a shareable link.</p>
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
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {created ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm shadow-sm">
          <p className="font-medium text-blue-700">Short URL created</p>
          <p className="mb-3 break-all text-slate-700">{created.shortUrl}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              onClick={() => navigator.clipboard.writeText(created.shortUrl)}
              type="button"
            >
              Copy URL
            </button>
            <a
              className="rounded-xl border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-yellow-200"
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
