"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type Campaign = { id: string; ownerId: string; name: string; type: string; status: string; budgetTotal: number; budgetSpent: number; createdAt: string };
type Resp = { items: Campaign[] };

export default function AdminCampaignsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<Campaign[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      const data = await apiRequest<Resp>("/admin/campaigns?page=1&limit=100", { token });
      setRows(data.items);
    };
    void run();
  }, [token]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Campaign</th><th className="px-3 py-2 text-left">Owner</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Budget</th><th className="px-3 py-2 text-left">Spent</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr className="border-t border-slate-200" key={r.id}><td className="px-3 py-2 text-white">{r.name}</td><td className="px-3 py-2 text-slate-500">{r.ownerId}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2">{r.budgetTotal}</td><td className="px-3 py-2">{r.budgetSpent}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
