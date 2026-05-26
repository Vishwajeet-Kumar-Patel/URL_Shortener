"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type SubscriptionSummary = {
  id: string;
  planId: string;
  planName: string;
  interval: "FREE" | "MONTHLY" | "YEARLY";
  status: string;
  startsAt: string;
  endsAt?: string;
  renewAt?: string;
} | null;

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

type InvoiceResponse = {
  items: InvoiceItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function BillingPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [subscription, setSubscription] = useState<SubscriptionSummary>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const sub = await apiRequest<SubscriptionSummary>("/subscriptions/me", { token });
        const invoiceData = await apiRequest<InvoiceResponse>("/invoices/me?page=1&limit=20", { token });
        setSubscription(sub);
        setInvoices(invoiceData.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load billing data");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white sm:text-2xl">Billing</h1>
          <p className="mt-1 text-sm text-slate-500">Track your subscription and invoices.</p>
        </div>
        <Link
          className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-white sm:shrink-0"
          href="/pricing"
        >
          View plans
        </Link>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {loading ? <p className="text-slate-500">Loading billing data...</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-white">Current subscription</h2>
        {subscription ? (
          <div className="mt-3 text-sm text-slate-600">
            <p className="font-medium text-white">{subscription.planName}</p>
            <p className="mt-1 text-slate-500">Status: {subscription.status}</p>
            <p className="mt-1 text-slate-500">Interval: {subscription.interval}</p>
            {subscription.renewAt ? (
              <p className="mt-1 text-slate-500">
                Renews: {new Date(subscription.renewAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No active subscription yet.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Invoices</h2>
        </div>
        {invoices.length === 0 && !loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2">Paid</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr className="border-t border-slate-200" key={invoice.id}>
                    <td className="px-4 py-2 text-slate-700">{invoice.type}</td>
                    <td className="px-4 py-2 text-slate-600">{invoice.status}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {invoice.currency} {invoice.amount}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(invoice.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
