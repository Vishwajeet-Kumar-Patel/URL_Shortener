"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type TopLink = { urlId: string; shortCode: string; totalClicks: number; uniqueClicks: number; originalUrl?: string };
type Resp = { items: TopLink[] };

export default function AdminClickLogsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<TopLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        setError(null);
        const data = await apiRequest<Resp>("/analytics/admin/links/top?days=30&limit=100", { token });
        setRows(data.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load click logs");
      }
    };
    void run();
  }, [token]);

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Click Logs</h1>
        <p className="text-sm text-slate-500">Qualified traffic leaderboard over the last 30 days.</p>
      </header>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Box label="Tracked Links" value={rows.length} />
        <Box label="Total Qualified Clicks" value={rows.reduce((a, b) => a + b.totalClicks, 0)} />
        <Box label="Total Unique" value={rows.reduce((a, b) => a + b.uniqueClicks, 0)} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Short</th><th className="px-3 py-2 text-left">Original URL</th><th className="px-3 py-2 text-left">Clicks</th><th className="px-3 py-2 text-left">Unique</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr className="border-t border-slate-200" key={r.urlId}><td className="px-3 py-2 text-white">{r.shortCode}</td><td className="max-w-xs truncate px-3 py-2 text-slate-600" title={r.originalUrl}>{r.originalUrl ?? "—"}</td><td className="px-3 py-2">{r.totalClicks}</td><td className="px-3 py-2 text-blue-600">{r.uniqueClicks}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Box({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
