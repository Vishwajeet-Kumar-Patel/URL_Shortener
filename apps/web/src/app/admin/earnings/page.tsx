// filepath: apps/web/src/app/admin/earnings/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { apiRequest } from "@/lib/api-client";
import Link from "next/link";

interface EarningsBreakdown {
  totalEarnings: number;
  bySource: {
    subscriptions: number;
    cpmClicks: number;
    referrals: number;
    adjustments: number;
  };
  byAdEvents: {
    popupImpressions: number;
    popupClicks: number;
  };
  byCountry: Array<{ country: string; amount: number }>;
  byDate: Array<{ date: string; amount: number }>;
  byPlan?: Array<{ planName: string; amount: number; memberCount: number }>;
}

interface SummaryStats {
  totalEarnings: number;
  totalMembers: number;
  totalActiveSubscriptions: number;
  totalQualifiedClicks: number;
  averageEarningsPerMember: number;
}

export default function AdminEarningsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [breakdown, setBreakdown] = useState<EarningsBreakdown | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30"); // days

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const since = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        since: since.toISOString(),
        until: now.toISOString()
      });

      const [breakdownData, summaryData] = (await Promise.all([
        apiRequest<EarningsBreakdown>(`/admin/earnings?${params.toString()}`, { token }),
        apiRequest<SummaryStats>(`/admin/earnings/summary?${params.toString()}`, { token })
      ])) as [EarningsBreakdown, SummaryStats];

      setBreakdown(breakdownData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token, period]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Earnings</h1>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </section>
    );
  }

  const topCountries = breakdown?.byCountry
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5) || [];

  const recentDays = breakdown?.byDate.slice(-7) || [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Earnings</h1>
          <p className="mt-2 text-sm text-slate-500">Platform revenue breakdown and analytics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
          </select>
          <button
            onClick={loadData}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="interactive-lift rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-panel">
          <p className="text-sm text-emerald-700">Total Earnings</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            ₹{breakdown?.totalEarnings.toFixed(2) || "0.00"}
          </p>
          <p className="mt-1 text-xs text-emerald-600">Platform revenue</p>
        </div>

        <div className="interactive-lift rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-panel">
          <p className="text-sm text-blue-700">Subscriptions</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            ₹{breakdown?.bySource.subscriptions.toFixed(2) || "0.00"}
          </p>
          <p className="mt-1 text-xs text-blue-600">Plan revenue</p>
        </div>

        <div className="interactive-lift rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-panel">
          <p className="text-sm text-violet-700">CPM Margin</p>
          <p className="mt-2 text-3xl font-bold text-violet-700">
            ₹{breakdown?.bySource.cpmClicks.toFixed(2) || "0.00"}
          </p>
          <p className="mt-1 text-xs text-violet-600">20% from ad revenue</p>
        </div>

        <div className="interactive-lift rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-panel">
          <p className="text-sm text-amber-700">Active Subscriptions</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {summary?.totalActiveSubscriptions || "0"}
          </p>
          <p className="mt-1 text-xs text-amber-600">Paid members</p>
        </div>

        <div className="interactive-lift rounded-2xl border border-cyan-200 bg-cyan-50 p-6 shadow-panel">
          <p className="text-sm text-cyan-700">Avg per Member</p>
          <p className="mt-2 text-3xl font-bold text-cyan-700">
            ₹{summary?.averageEarningsPerMember.toFixed(2) || "0.00"}
          </p>
          <p className="mt-1 text-xs text-cyan-600">Per member average</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Source */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-lg font-semibold text-slate-900">Revenue by Source</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600">Subscriptions</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                ₹{breakdown?.bySource.subscriptions.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-sm text-slate-600">CPM Clicks</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                ₹{breakdown?.bySource.cpmClicks.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-600">Referral Commission</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                ₹{breakdown?.bySource.referrals.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Total</span>
                <span className="text-lg font-bold text-emerald-700">
                  ₹{breakdown?.totalEarnings.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Ad popup impressions</span>
                <span className="text-sm font-semibold text-slate-900">
                  {breakdown?.byAdEvents.popupImpressions ?? 0}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-600">Ad popup clicks</span>
                <span className="text-sm font-semibold text-slate-900">
                  {breakdown?.byAdEvents.popupClicks ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-lg font-semibold text-slate-900">Top Countries (CPM)</h2>
          <div className="mt-4 space-y-3">
            {topCountries.length > 0 ? (
              topCountries.map((country) => (
                <div key={country.country} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{country.country}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{
                          width: `${(country.amount / (topCountries[0]?.amount || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      ₹{country.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Earnings Trend */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold text-slate-900">Recent Earnings Trend</h2>
        <div className="mt-6 flex h-40 items-end gap-2">
          {recentDays.length > 0 ? (
            recentDays.map((day) => {
              const maxAmount = Math.max(...recentDays.map((d) => d.amount), 1);
              const height = (day.amount / maxAmount) * 100;

              return (
                <div key={day.date} className="flex flex-1 flex-col items-center">
                  <div className="relative h-32 w-full">
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-yellow-300"
                      style={{ height: `${height}%` }}
                      title={`₹${day.amount.toFixed(2)}`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No data for this period</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/cpm-rates"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-blue-200 hover:bg-blue-50"
        >
          <p className="text-sm font-semibold text-slate-900">Manage CPM Rates</p>
          <p className="mt-1 text-xs text-slate-500">Configure country rates</p>
        </Link>
        <Link
          href="/admin/invoices"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-blue-200 hover:bg-blue-50"
        >
          <p className="text-sm font-semibold text-slate-900">View Invoices</p>
          <p className="mt-1 text-xs text-slate-500">Payment records</p>
        </Link>
        <Link
          href="/admin/click-logs"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-blue-200 hover:bg-blue-50"
        >
          <p className="text-sm font-semibold text-slate-900">Click Analytics</p>
          <p className="mt-1 text-xs text-slate-500">Qualified traffic</p>
        </Link>
        <Link
          href="/admin/reports"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-blue-200 hover:bg-blue-50"
        >
          <p className="text-sm font-semibold text-slate-900">Full Reports</p>
          <p className="mt-1 text-xs text-slate-500">Detailed analysis</p>
        </Link>
      </div>
    </section>
  );
}
