"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/page-primitives";
import { useAuthStore } from "@/store/auth.store";

type Report = {
  periodDays: number;
  users: { total: number; active: number; banned: number };
  urls: { total: number; active: number; paused: number; deleted: number };
  clicks: { total: number; unique: number };
  invoices: { total: number; paid: number; pending: number };
  revenue: { grossCollected: number };
};

export default function AdminReportsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;

      setError(null);

      try {
        const data = await apiRequest<Report>("/admin/reports?days=30", { token });
        setReport(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      }
    };

    void run();
  }, [token]);

  return (
    <section className="space-y-6">
      <SectionHeader
        kicker="Executive Insights"
        title="Reports"
        description="Cross-platform operational report over the selected period with users, links, traffic and collections."
      />
      {error ? <p className="text-red-300">{error}</p> : null}
      {!report ? <p className="text-slate-500">Loading report...</p> : null}
      {report ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard hint={`active ${report.users.active} - banned ${report.users.banned}`} label="Users" value={report.users.total} />
          <MetricCard hint={`active ${report.urls.active} - paused ${report.urls.paused}`} label="URLs" value={report.urls.total} />
          <MetricCard hint={`unique ${report.clicks.unique}`} label="Clicks" value={report.clicks.total} />
          <MetricCard hint={`paid ${report.invoices.paid} - pending ${report.invoices.pending}`} label="Invoices" value={report.invoices.total} />
          <MetricCard hint="Collected from paid invoices" label="Gross revenue" value={`${report.revenue.grossCollected}`} />
        </div>
      ) : null}
    </section>
  );
}