"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type Overview = { totals: { urls: number; active: number; paused: number; hidden: number; deleted: number; clicks: number; uniqueClicks: number } };

export default function AdvertiserAnalyticsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      const data = await apiRequest<Overview>("/analytics/overview?days=30", { token });
      setOverview(data);
    };
    void run();
  }, [token]);

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold text-white">Analytics</h1>
      {!overview ? <p className="text-slate-400">Loading analytics...</p> : (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Qualified Clicks" value={overview.totals.clicks} />
          <Metric label="Unique Qualified" value={overview.totals.uniqueClicks} />
          <Metric label="Active Links" value={overview.totals.active} />
          <Metric label="Paused Links" value={overview.totals.paused} />
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
