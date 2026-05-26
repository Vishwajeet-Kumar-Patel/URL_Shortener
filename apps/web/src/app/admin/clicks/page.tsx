"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type AdminOverview = {
  totals: {
    users: number;
    activeUsers: number;
    bannedUsers: number;
    urls: number;
    activeUrls: number;
    pausedUrls: number;
    deletedUrls: number;
    clicks: number;
  };
  trends: {
    clicksByDay: Array<{ date: string; count: number }>;
  };
};

export default function AdminClicksPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setError(null);
      try {
        const data = await apiRequest<AdminOverview>("/analytics/admin/overview?days=90", { token });
        setOverview(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    };
    void run();
  }, [token]);

  const maxDay = useMemo(() => {
    const rows = overview?.trends.clicksByDay ?? [];
    return rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  }, [overview]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Clicks & traffic</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Every successful redirect increments click counts and feeds your analytics. Use this view to see
          platform-wide engagement over the last 90 days. For per-link detail, open{" "}
          <Link className="text-blue-600 underline hover:text-blue-600" href="/admin/urls">
            All URLs
          </Link>{" "}
          and inspect individual short links.
        </p>
      </div>

      {error ? <p className="text-red-400">{error}</p> : null}
      {!overview && !error ? <p className="text-slate-500">Loading...</p> : null}

      {overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Total clicks (all time)</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{overview.totals.clicks}</p>
              <p className="mt-2 text-xs text-slate-500">Aggregated across every short link on the platform.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Active short links</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-400">
                {overview.totals.activeUrls}
              </p>
              <p className="mt-2 text-xs text-slate-500">Links that can currently receive traffic.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-slate-500">Paused links</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-400">
                {overview.totals.pausedUrls}
              </p>
              <p className="mt-2 text-xs text-slate-500">Paused links return 410 until reactivated.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/95 p-5 md:p-6">
            <h2 className="text-lg font-medium text-white">Daily clicks (last 90 days)</h2>
            <p className="mt-1 text-sm text-slate-500">
              Taller bars mean more redirects that day. Spikes often follow campaigns or shared links going
              viral.
            </p>
            <div className="mt-6 space-y-2">
              {overview.trends.clicksByDay.length === 0 ? (
                <p className="text-sm text-slate-500">No click data in this range yet.</p>
              ) : (
                overview.trends.clicksByDay.map((row) => (
                  <div className="flex items-center gap-3 text-sm" key={row.date}>
                    <span className="w-24 shrink-0 tabular-nums text-slate-500">
                      {new Date(row.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.max(4, (row.count / maxDay) * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right tabular-nums text-slate-600">{row.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
