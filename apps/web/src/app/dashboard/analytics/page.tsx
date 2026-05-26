"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type UserOverview = {
  totals: {
    urls: number;
    active: number;
    paused: number;
    hidden: number;
    deleted: number;
    clicks: number;
    uniqueClicks: number;
  };
  trends: {
    clicksByDay: Array<{ date: string; count: number }>;
    uniqueClicksByDay: Array<{ date: string; count: number }>;
  };
};

type TopLinksResponse = {
  items: Array<{
    urlId: string;
    shortCode: string;
    totalClicks: number;
    uniqueClicks: number;
    originalUrl?: string;
  }>;
};

export default function DashboardAnalyticsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [topLinks, setTopLinks] = useState<TopLinksResponse["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [ov, top] = await Promise.all([
          apiRequest<UserOverview>("/analytics/me/overview?days=30", { token }),
          apiRequest<TopLinksResponse>("/analytics/me/links/top?days=30&limit=8", { token })
        ]);
        setOverview(ov);
        setTopLinks(top.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load analytics");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  const clicksSeries = overview?.trends.clicksByDay ?? [];
  const maxClicks = Math.max(1, ...clicksSeries.map((d) => d.count));

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Last 30 days for your workspace.</p>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {loading ? <p className="text-slate-500">Loading analytics...</p> : null}

      {overview && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total clicks", overview.totals.clicks],
              ["Unique clicks", overview.totals.uniqueClicks],
              ["Active URLs", overview.totals.active],
              ["Paused URLs", overview.totals.paused]
            ].map(([label, value]) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4" key={String(label)}>
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-white">Click trend</h2>
            {clicksSeries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No click data in this window.</p>
            ) : (
              <div className="mt-4 flex h-48 items-end gap-2 border-b border-slate-200 pb-1">
                {clicksSeries.slice(-14).map((day) => {
                  const pct = Math.round((day.count / maxClicks) * 100);
                  return (
                    <div className="flex h-full flex-1 flex-col items-center justify-end gap-1" key={day.date}>
                      <div
                        className="w-full rounded-t bg-blue-500/90"
                        style={{ height: `${day.count ? Math.max(pct, 6) : 0}%` }}
                        title={`${day.date}: ${day.count}`}
                      />
                      <span className="max-w-full truncate text-[10px] text-slate-500">
                        {day.date.slice(5).replace("-", "/")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-white">Top links</h2>
            {topLinks.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No links with clicks in this window.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2">Short code</th>
                      <th className="px-3 py-2">Clicks</th>
                      <th className="px-3 py-2">Unique</th>
                      <th className="px-3 py-2">Destination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLinks.map((row) => (
                      <tr className="border-t border-slate-200" key={row.urlId}>
                        <td className="px-3 py-2 font-mono text-blue-500">{row.shortCode}</td>
                        <td className="px-3 py-2 text-slate-700">{row.totalClicks}</td>
                        <td className="px-3 py-2 text-slate-700">{row.uniqueClicks}</td>
                        <td className="max-w-xs truncate px-3 py-2 text-slate-500">{row.originalUrl ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
