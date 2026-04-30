"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type ReferralSummary = {
  code: string;
  referralLink: string;
  totalReferred: number;
  totalEarnings: number;
};

type ReferralEarning = {
  id: string;
  referredUserId: string;
  amount: number;
  grossAmount: number;
  ratePercent: number;
  createdAt: string;
};

type ReferralEarningsResp = {
  items: ReferralEarning[];
};

export default function DashboardReferralsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [items, setItems] = useState<ReferralEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError("Please sign in to view referrals.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [s, e] = await Promise.all([
          apiRequest<ReferralSummary>("/referrals/me", { token }),
          apiRequest<ReferralEarningsResp>("/referrals/earnings?page=1&limit=20", { token })
        ]);
        setSummary(s);
        setItems(e.items);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load referrals";
        setError(message);
        setSummary({
          code: user?.userId ? `REF_${user.userId.slice(0, 8).toUpperCase()}` : "REF_MEMBER",
          referralLink: "",
          totalReferred: 0,
          totalEarnings: 0
        });
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token, user?.userId]);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Earnings</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Referrals</h1>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : !summary ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-[#08101e] p-4">
            <p className="text-sm text-slate-400">Your referral code</p>
            <p className="mt-1 text-xl font-semibold text-white">{summary.code}</p>
            {summary.referralLink ? (
              <p className="mt-2 break-all text-sm text-cyan-300">{summary.referralLink}</p>
            ) : null}
            <p className="mt-3 text-sm text-slate-300">
              Referred: {summary.totalReferred} | Earnings: {summary.totalEarnings}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#08101e]">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Gross</th>
                  <th className="px-3 py-2 text-left">Rate</th>
                  <th className="px-3 py-2 text-left">Earning</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-400" colSpan={4}>
                      No referral earnings yet.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr className="border-t border-white/10" key={row.id}>
                      <td className="px-3 py-2 text-slate-300">{row.referredUserId}</td>
                      <td className="px-3 py-2 text-slate-300">{row.grossAmount}</td>
                      <td className="px-3 py-2 text-slate-300">{row.ratePercent}%</td>
                      <td className="px-3 py-2 text-emerald-300">{row.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
