"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type Invoice = { id: string; amount: number; currency: string; status: string; type: string; createdAt: string };
type Resp = { items: Invoice[] };

export default function AdvertiserBillingPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<Invoice[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      const data = await apiRequest<Resp>("/invoices?page=1&limit=50", { token });
      setItems(data.items);
    };
    void run();
  }, [token]);

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold text-white">Billing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Tile label="Invoices" value={items.length} />
        <Tile label="Paid" value={items.filter((i) => i.status === "PAID").length} />
        <Tile label="Pending" value={items.filter((i) => i.status === "PENDING").length} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/70"><tr><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Date</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr className="border-t border-slate-800" key={i.id}><td className="px-3 py-2">{i.type}</td><td className="px-3 py-2">{i.status}</td><td className="px-3 py-2">{i.currency} {i.amount}</td><td className="px-3 py-2 text-slate-400">{new Date(i.createdAt).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
