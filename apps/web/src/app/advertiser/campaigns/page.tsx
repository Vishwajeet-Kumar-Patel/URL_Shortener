"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type Campaign = { id: string; name: string; status: string; budgetTotal: number; budgetSpent: number; createdAt: string };
type CampaignResp = { items: Campaign[] };

export default function AdvertiserCampaignsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<Campaign[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      const data = await apiRequest<CampaignResp>("/campaigns?page=1&limit=100", { token });
      setItems(data.items);
    };
    void run();
  }, [token]);

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Campaigns</h1>
        <p className="text-sm text-slate-400">All campaigns with budget utilization and status for operational control.</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/70"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Budget</th><th className="px-3 py-2 text-left">Spent</th><th className="px-3 py-2 text-left">Utilization</th></tr></thead>
          <tbody>
            {items.map((c) => {
              const util = c.budgetTotal > 0 ? Math.round((c.budgetSpent / c.budgetTotal) * 100) : 0;
              return <tr className="border-t border-slate-800" key={c.id}><td className="px-3 py-2 text-white">{c.name}</td><td className="px-3 py-2">{c.status}</td><td className="px-3 py-2">{c.budgetTotal}</td><td className="px-3 py-2">{c.budgetSpent}</td><td className="px-3 py-2 text-indigo-300">{util}%</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
