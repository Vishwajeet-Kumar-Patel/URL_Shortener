"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type TrafficSession = {
  sessionId: string;
  createdAt: string;
  linksGenerated: number;
  totalClicks: number;
  earnings: number;
};

type PaginatedResponse = {
  items: TrafficSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function TrafficUsersViewPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await apiRequest<PaginatedResponse>(`/referrals/traffic-stats?page=${page}`, {
        token: token ?? undefined
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load traffic stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void fetchStats();
  }, [token, page]);

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#09111f] via-[#07101c] to-[#120d27] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-400/70">Partner Analytics</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Traffic Partners</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Monitor performance of anonymous users referred through your link.
        </p>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#08101e] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-semibold text-white">Referred Traffic Sessions</h2>
          <p className="mt-1 text-sm text-slate-400">Detailed breakdown of each anonymous generator.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Session ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Joined At</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Links</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Total Clicks</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Est. Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8 h-12 bg-white/[0.02] rounded-lg"></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-rose-500">{error}</td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No referred traffic sessions yet. Start sharing your referral link!
                  </td>
                </tr>
              ) : (
                data?.items.map((item) => (
                  <tr key={item.sessionId} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-medium text-slate-300 group-hover:text-indigo-400 transition-colors">
                        {item.sessionId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                        {item.linksGenerated} links
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">
                      {item.totalClicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-emerald-400">
                        ₹{item.earnings.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.01]">
            <p className="text-xs text-slate-500">
              Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} results)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <button
                disabled={page === data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
