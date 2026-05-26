"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type InvoiceItem = {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  provider?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  referenceId?: string;
  createdAt: string;
  paidAt?: string;
};

type InvoiceListResponse = {
  items: InvoiceItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const typeGuide = [
  {
    code: "PLAN_PURCHASE",
    title: "Plan purchase",
    body: "Created when a user checks out a subscription. Shows plan price, Razorpay order id, and moves to PAID after successful verification."
  },
  {
    code: "CAMPAIGN",
    title: "Campaign funding",
    body: "Advertisers funding a campaign wallet. Appears with a campaign reference once checkout completes."
  },
  {
    code: "WALLET_TOPUP",
    title: "Wallet top-up",
    body: "Publisher or member adding balance. Pairs with wallet ledger credits when payment is confirmed."
  }
] as const;

const statusGuide = [
  { code: "PENDING", detail: "Checkout started; awaiting payment confirmation." },
  { code: "PAID", detail: "Money captured; entitlements or wallet credits applied." },
  { code: "FAILED", detail: "Payment failed or verification did not succeed." },
  { code: "CANCELED", detail: "User or system canceled before capture." }
] as const;

export default function AdminInvoicesPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<InvoiceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<InvoiceListResponse>("/invoices/admin?page=1&limit=100", { token });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items ?? [];
  const paid = items.filter((i) => i.status === "PAID").length;
  const pending = items.filter((i) => i.status === "PENDING").length;

  return (
    <section className="space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-white">Invoices</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Invoices are the billing paper trail for every paid flow: subscriptions, campaign budgets, and wallet
          top-ups. Each row is one Razorpay (or future provider) attempt with a clear status so finance and
          support can audit revenue.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/95 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total rows</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{data?.pagination.total ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Loaded from the live database.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/95 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-300">{paid}</p>
          <p className="mt-1 text-xs text-slate-500">Successful captures in this page slice.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/95 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-200">{pending}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting checkout or webhook-style confirmation.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600">Invoice types</h2>
          <ul className="mt-4 space-y-4 text-sm text-slate-600">
            {typeGuide.map((t) => (
              <li key={t.code}>
                <p className="font-medium text-white">
                  <span className="font-mono text-xs text-blue-500">{t.code}</span> — {t.title}
                </p>
                <p className="mt-1 leading-relaxed text-slate-500">{t.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600">Statuses</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {statusGuide.map((s) => (
              <li className="flex gap-2" key={s.code}>
                <span className="shrink-0 font-mono text-xs text-slate-500">{s.code}</span>
                <span className="text-slate-500">{s.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            When data exists, the table below lists type, status, amount, reference ids, and timestamps exactly
            as stored—ideal for reconciling with Razorpay dashboards.
          </p>
        </div>
      </div>

      {loading ? <p className="text-slate-500">Loading...</p> : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No invoices yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            As soon as someone completes a paid checkout, a row will appear here with provider ids and amounts.
            Use the guides above so your team knows how to read each column when traffic picks up.
          </p>
        </div>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">User ref</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Paid</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr className="border-t border-slate-200" key={row.id}>
                  <td className="px-3 py-2 text-slate-700">{row.type}</td>
                  <td className="px-3 py-2 text-slate-600">{row.status}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.currency} {row.amount}
                  </td>
                  <td className="max-w-[8rem] truncate px-3 py-2 text-slate-500">{row.referenceId ?? "—"}</td>
                  <td className="max-w-[8rem] truncate px-3 py-2 text-slate-500">{row.providerOrderId ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {row.paidAt ? new Date(row.paidAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
