"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import {
  formButtonPrimaryClass,
  formLabelClass
} from "@/components/ui/form-classes";

type UrlResult = {
  shortUrl: string;
  originalUrl: string;
};

export default function MassShrinkerPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [urls, setUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<UrlResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urls.trim()) return;

    setSubmitting(true);
    setError(null);
    setResults(null);

    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    try {
      const data = await apiRequest<UrlResult[]>("/urls/bulk", {
        method: "POST",
        token: token ?? undefined,
        body: { urls: urlList }
      });
      setResults(data);
      setUrls("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process bulk URLs");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#09111f] via-[#07101c] to-[#120d27] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/70">Tools & Automation</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Mass Shrinker</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Shorten hundreds of URLs at once. Paste your long links below, one per line.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-[#08101e] p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className={formLabelClass} htmlFor="urls">
                Paste URLs (one per line)
              </label>
              <textarea
                id="urls"
                className="mt-2 w-full min-h-[300px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              className={formButtonPrimaryClass}
              disabled={submitting || !urls.trim()}
            >
              {submitting ? "Processing..." : "Mass Shrink"}
            </button>
          </form>
          {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-[#08101e] p-6">
          <h2 className="text-xl font-semibold text-white">Results</h2>
          <p className="mt-1 text-sm text-slate-400">Your shortened links will appear here.</p>
          
          <div className="mt-6 space-y-3">
            {!results && !submitting && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <svg className="h-12 w-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="mt-4">Ready for batch processing</p>
              </div>
            )}

            {submitting && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <p className="mt-4">Shortening your links...</p>
              </div>
            )}

            {results && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-emerald-400">{results.length} links generated</p>
                  <button 
                    onClick={() => {
                      const text = results.map(r => r.shortUrl).join("\n");
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    Copy All
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {results.map((res, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm">
                      <p className="truncate text-slate-400 text-xs">{res.originalUrl}</p>
                      <p className="mt-1 font-mono text-cyan-300">{res.shortUrl}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
