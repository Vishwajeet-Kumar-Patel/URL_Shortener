"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/page-primitives";

type Campaign = { id: string; name: string; status: string; budgetTotal: number; budgetSpent: number; createdAt: string };
type CampaignResp = { items: Campaign[] };

export default function AdvertiserHomePage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<Campaign[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      const data = await apiRequest<CampaignResp>("/campaigns?page=1&limit=50", { token });
      setItems(data.items);
    };
    void run();
  }, [token]);

  const stats = useMemo(() => {
    const spend = items.reduce((a, b) => a + b.budgetSpent, 0);
    const budget = items.reduce((a, b) => a + b.budgetTotal, 0);
    return {
      campaigns: items.length,
      active: items.filter((i) => i.status === "ACTIVE").length,
      spend,
      budget,
      utilization: budget > 0 ? Math.round((spend / budget) * 100) : 0
    };
  }, [items]);

  return (
    <section className="space-y-6">
      <SectionHeader
        kicker="Advertiser Console"
        title="Overview"
        description="Monitor campaign health, spend utilization, and optimization opportunities."
      />
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Campaigns" value={stats.campaigns} />
        <MetricCard label="Active" value={stats.active} />
        <MetricCard label="Total Budget" value={`INR ${stats.budget}`} />
        <MetricCard label="Spent" value={`INR ${stats.spend}`} />
        <MetricCard label="Utilization" value={`${stats.utilization}%`} />
      </div>
    </section>
  );
}
