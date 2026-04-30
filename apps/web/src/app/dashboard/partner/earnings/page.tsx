"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { apiRequest } from "@/lib/api-client";
import Link from "next/link";
import { AdminAppShell } from "@/components/admin/admin-app-shell";

type EarningBreakdown = {
  country: string;
  clicks: number;
  earnings: number;
};

type EarningsData = {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalQualifiedClicks: number;
  breakdown: EarningBreakdown[];
};

export default function EarningsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!token || !user?.id) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        // This endpoint would need to be created in the backend
        const data = await apiRequest<EarningsData>(
          `/users/${user.id}/earnings`,
          { method: "GET", token }
        );
        setEarnings(data);
      } catch (err) {
        // Mock data for demo
        setEarnings({
          totalEarnings: 0,
          thisMonthEarnings: 0,
          totalQualifiedClicks: 0,
          breakdown: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [token, user?.id]);

  if (loading) {
    return (
      <AdminAppShell>
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
          <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-8 w-8"></div>
        </div>
      </AdminAppShell>
    );
  }

  return (
    <AdminAppShell>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/partner/referral-link" className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
            ← Back to Referral Code
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Earnings</h1>
          <p className="text-slate-300">Track your CPM earnings from qualified traffic</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400 mb-2">Total Earnings</p>
            <p className="text-3xl font-bold text-emerald-400">₹{earnings?.totalEarnings?.toFixed(2) || "0.00"}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400 mb-2">This Month</p>
            <p className="text-3xl font-bold text-white">₹{earnings?.thisMonthEarnings?.toFixed(2) || "0.00"}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400 mb-2">Qualified Clicks</p>
            <p className="text-3xl font-bold text-indigo-400">{earnings?.totalQualifiedClicks || 0}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Earnings by Country</h2>
          
          {(!earnings?.breakdown || earnings.breakdown.length === 0) ? (
            <p className="text-slate-400 text-center py-8">No earnings data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Country</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold">Clicks</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.breakdown.map((row) => (
                    <tr key={row.country} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-white">{row.country}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{row.clicks}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">₹{row.earnings.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <Link
            href="/dashboard/partner/withdrawal"
            className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 text-center font-semibold text-white hover:bg-emerald-500 transition-all"
          >
            Request Withdrawal
          </Link>
          <Link
            href="/dashboard/partner/referral-link"
            className="flex-1 rounded-lg border border-slate-700 px-6 py-3 text-center font-semibold text-slate-300 hover:bg-slate-800 transition-all"
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  </AdminAppShell>
  );
}
