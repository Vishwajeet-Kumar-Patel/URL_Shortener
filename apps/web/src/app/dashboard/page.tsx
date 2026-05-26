"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UrlCreateForm } from "@/components/dashboard/url-create-form";
import { UrlTable } from "@/components/dashboard/url-table";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type UrlListResponse = {
  items: Array<{
    id: string;
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    status: string;
    clickCount: number;
    createdAt: string;
  }>;
};

type AnalyticsOverview = {
  totals: {
    urls: number;
    active: number;
    paused: number;
    hidden: number;
    deleted: number;
    clicks: number;
    uniqueClicks: number;
  };
};

type WalletSummary = {
  balance: number;
  pendingAmount: number;
};

type ReferralSummary = {
  code: string;
  referralLink: string;
  totalReferred: number;
  totalEarnings: number;
};

type InvoiceItem = {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
};

type InvoiceResponse = {
  items: InvoiceItem[];
};

type DashboardSummary = {
  analytics: AnalyticsOverview | null;
  wallet: WalletSummary | null;
  referrals: ReferralSummary | null;
  traffic: {
    totalUsersBrought: number;
    totalLinksGenerated: number;
    totalQualifiedClicks: number;
    totalEarnings: number;
    thisMonthUsers: number;
    thisMonthEarnings: number;
  } | null;
  invoices: InvoiceItem[];
};

export default function DashboardPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<UrlListResponse["items"]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    analytics: null,
    wallet: null,
    referrals: null,
    traffic: null,
    invoices: []
  });
  const [loading, setLoading] = useState(true);

  const loadUrls = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<UrlListResponse>("/urls?page=1&limit=10", { token });
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUrls();
  }, [token]);

  useEffect(() => {
    const loadSummary = async () => {
      if (!token) return;
      const results = await Promise.allSettled([
        apiRequest<AnalyticsOverview>("/analytics/me/overview?days=30", { token }),
        apiRequest<WalletSummary>("/wallet/summary", { token }),
        apiRequest<ReferralSummary>("/referrals/me", { token }),
        apiRequest<InvoiceResponse>("/invoices/me?page=1&limit=5", { token }),
        apiRequest<{ data: any }>("/referrals/stats", { token })
      ]);

      setSummary({
        analytics: results[0].status === "fulfilled" ? results[0].value : null,
        wallet: results[1].status === "fulfilled" ? results[1].value : null,
        referrals: results[2].status === "fulfilled" ? results[2].value : null,
        invoices: results[3].status === "fulfilled" ? results[3].value.items : [],
        traffic: results[4].status === "fulfilled" ? results[4].value.data : null
      });
    };

    void loadSummary();
  }, [token]);

  const totalClicks = summary.analytics?.totals.clicks ?? items.reduce((sum, item) => sum + item.clickCount, 0);
  const totalEarnings = summary.referrals?.totalEarnings ?? 0;
  //const avgCpm = totalClicks > 0 ? (totalEarnings / totalClicks) * 1000 : 0;
  const referralCode = summary.referrals?.code ?? `REF_${user?.id?.slice(0, 8).toUpperCase() ?? "MEMBER"}`;

  return (
    <div className="space-y-8 fade-in">
      <section className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-blue-50/50 to-yellow-50/70 p-5 shadow-panel md:grid-cols-[1.4fr_0.8fr] md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Member Control Center</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Create short links, track traffic, earn from referrals, and manage payouts from one consistent workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              className="rounded-full bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500"
              href="/dashboard#new-link"
            >
              New Shorten Link
            </Link>
            <Link className="rounded-full border border-blue-200 bg-white px-4 py-2 text-blue-700 transition hover:bg-blue-50" href="/dashboard/analytics">
              View Statistics
            </Link>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Referral snapshot</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{referralCode}</p>
          <p className="mt-2 break-all text-blue-600">{summary.referrals?.referralLink ?? "Loading referral link..."}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Referred</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{summary.referrals?.totalReferred ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Earnings</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                ₹{totalEarnings.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="interactive-lift rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm font-medium text-slate-500">Total Views</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalClicks}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">Traffic across active links</p>
        </div>
        <div className="interactive-lift rounded-[1.25rem] border border-blue-200 bg-blue-50 p-5 shadow-panel">
          <p className="text-sm font-medium text-blue-700">Traffic Earnings</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">₹{(summary.traffic?.totalEarnings ?? 0).toFixed(2)}</p>
          <p className="mt-3 text-xs font-medium text-slate-600">From your referred traffic generators</p>
        </div>
        <div className="interactive-lift rounded-[1.25rem] border border-yellow-200 bg-yellow-50 p-5 shadow-panel">
          <p className="text-sm font-medium text-slate-700">Referral Earnings</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">₹{(summary.referrals?.totalEarnings ?? 0).toFixed(2)}</p>
          <p className="mt-3 text-xs font-medium text-slate-600">From your referred members</p>
        </div>
        <div className="interactive-lift rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm font-medium text-slate-500">Total Balance</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">₹{(summary.wallet?.balance ?? 0).toFixed(2)}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">Available for withdrawal</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-panel">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Create</p>
            <h2 id="new-link" className="mt-2 text-xl font-semibold text-slate-900">
              New Shorten Link
            </h2>
            <p className="mt-1 text-sm text-slate-600">Generate a public short URL with the same backend flow used across the site.</p>
          </div>
          <UrlCreateForm onCreated={loadUrls} />
        </div>

        <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-panel">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Actions</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">What you can do here</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Manage Links", "/dashboard/urls", "All created URLs"],
              ["Withdraw", "/dashboard/wallet", "Request payouts"],
              ["Traffic Partners", "/dashboard/partner/traffic", "Monitor referred generators"],
              ["Mass Shrinker", "/dashboard/mass-shrinker", "Shorten links in bulk"],
              ["Referrals", "/dashboard/referrals", "Invite and earn"],
              ["Invoices", "/dashboard/billing", "Subscription history"],
              ["Settings", "/dashboard/profile", "Profile and password"],
              ["Support", "/dashboard/support", "Message the team"]
            ].map(([title, href, note]) => (
              <Link
                key={String(title)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-yellow-300 hover:bg-yellow-50"
                href={String(href)}
              >
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Recent invoices</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Billing history</h2>
            </div>
            <Link className="text-sm text-blue-600 hover:text-blue-500" href="/dashboard/billing">
              Open billing →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {summary.invoices.length === 0 ? (
              <p className="text-sm text-slate-500">No invoices yet.</p>
            ) : (
              summary.invoices.map((invoice) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm" key={invoice.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{invoice.type}</p>
                      <p className="text-xs text-slate-500">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="font-semibold text-blue-700">
                      {invoice.currency} {invoice.amount}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Recent URLs</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Manage links</h2>
            </div>
            <Link className="text-sm text-blue-600 hover:text-blue-500" href="/dashboard/urls">
              View all →
            </Link>
          </div>
          <div className="mt-4">
            {loading ? (
              <p className="text-slate-500">Loading URLs...</p>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-slate-600">No URLs yet. Create your first short link above.</p>
              </div>
            ) : (
              <UrlTable items={items} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
