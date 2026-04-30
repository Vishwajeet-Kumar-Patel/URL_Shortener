"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { apiRequest } from "@/lib/api-client";
import Link from "next/link";
import { AdminAppShell } from "@/components/admin/admin-app-shell";

type MemberStats = {
  totalUsersBrought: number;
  totalLinksGenerated: number;
  thisMonthUsers: number;
  referralCode: string;
};

export default function ReferralLinkPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token || !user?.userId) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest<MemberStats>(
          `/users/${user.userId}/member-stats`,
          { method: "GET", token }
        );
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load referral stats");
        setStats({
          totalUsersBrought: 0,
          totalLinksGenerated: 0,
          thisMonthUsers: 0,
          referralCode: `REF_${user.userId.substring(0, 8).toUpperCase()}`
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, user?.userId]);

  const handleCopyCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralUrl = stats ? `https://purplemerit-links.com?ref=${stats.referralCode}` : "";

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
          <h1 className="text-3xl font-bold text-white mb-2">Your Referral Code</h1>
          <p className="text-slate-300">Share your code and earn CPM for every qualified click</p>
        </div>

        {error ? (
          <div className="mb-8 rounded-lg border border-rose-700 bg-rose-950/30 p-4 text-rose-300">
            {error}
          </div>
        ) : null}

        {/* Referral Code Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Referral Code</h2>
          
          <div className="rounded-lg bg-slate-800 p-6 mb-6">
            <p className="text-sm text-slate-400 mb-2">Your Unique Referral Code</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={stats?.referralCode || ""}
                readOnly
                className="flex-1 rounded-lg bg-slate-700 px-4 py-3 font-mono text-lg text-white border border-slate-600"
              />
              <button
                onClick={handleCopyCode}
                className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Share URL */}
          <div className="rounded-lg bg-slate-800 p-6 mb-6">
            <p className="text-sm text-slate-400 mb-2">Referral URL</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 rounded-lg bg-slate-700 px-4 py-3 text-sm text-white border border-slate-600 overflow-hidden text-ellipsis"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-all whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Facebook
            </button>
            <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
              Twitter
            </button>
            <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600">
              Email
            </button>
            <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">
              WhatsApp
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400 mb-2">Total Users Brought</p>
            <p className="text-3xl font-bold text-white">{stats?.totalUsersBrought || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400 mb-2">Links Generated by Referrals</p>
            <p className="text-3xl font-bold text-white">{stats?.totalLinksGenerated || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400 mb-2">This Month Users</p>
            <p className="text-3xl font-bold text-emerald-400">{stats?.thisMonthUsers || 0}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/partner/anonymous-links"
            className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center hover:bg-slate-800 transition-all"
          >
            <p className="text-sm text-slate-400">📊 Anonymous Links</p>
          </Link>
          <Link
            href="/dashboard/partner/earnings"
            className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center hover:bg-slate-800 transition-all"
          >
            <p className="text-sm text-slate-400">💰 Earnings</p>
          </Link>
          <Link
            href="/dashboard/partner/withdrawal"
            className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center hover:bg-slate-800 transition-all"
          >
            <p className="text-sm text-slate-400">💳 Withdrawal</p>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center hover:bg-slate-800 transition-all"
          >
            <p className="text-sm text-slate-400">← Back</p>
          </Link>
        </div>
      </div>
    </div>
  </AdminAppShell>
  );
}
