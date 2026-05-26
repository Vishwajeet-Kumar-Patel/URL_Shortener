"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";

export default function DashboardToolsPage() {
  const user = useAuthStore((state) => state.user);

  const bookmarklet = useMemo(() => {
    const baseUrl = typeof window === "undefined" ? "" : window.location.origin.replace(/\/$/, "");
    return `javascript:(function(){window.open('${baseUrl}/dashboard/urls#create-link','_blank','noopener,noreferrer');})();`;
  }, []);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Utilities</p>
        <h1 className="text-3xl font-semibold text-white">Tools</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Quick utilities for link creation, API access, and faster workflows.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">API</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Authenticated access</h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your session token with the standard member endpoints: /urls, /analytics/me/overview, /wallet/summary,
            /referrals/me, and /invoices/me.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-white">Current member</p>
            <p className="mt-1 text-slate-500">{user?.name ?? "Signed-in member"}</p>
            <p className="mt-2 text-xs text-slate-500">The app uses the same JWT session already stored in your browser.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950" href="/dashboard/urls">
              Open URLs
            </Link>
            <Link className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-700" href="/dashboard/analytics">
              Open stats
            </Link>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Bookmarklet</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Create links faster</h2>
          <p className="mt-2 text-sm text-slate-500">
            Save this as a bookmark to jump straight to the short-link workspace.
          </p>
          <textarea
            className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-black/30 p-4 text-xs text-slate-600 outline-none"
            readOnly
            value={bookmarklet}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              onClick={() => navigator.clipboard.writeText(bookmarklet)}
              type="button"
            >
              Copy bookmarklet
            </button>
            <Link className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-700" href="/dashboard/support">
              Need help?
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}