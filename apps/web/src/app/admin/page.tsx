"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type AdminOverview = {
  totals: {
    uniqueClicks: string;
    users: number;
    activeUsers: number;
    bannedUsers: number;
    urls: number;
    activeUrls: number;
    pausedUrls: number;
    deletedUrls: number;
    clicks: number;
  };
  trends: {
    clicksByDay: Array<{ date: string; count: number }>;
  };
};

export default function AdminPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<any | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setError(null);
      try {
        const [ov, rep] = await Promise.all([
          apiRequest<AdminOverview>("/analytics/admin/overview?days=30", { token }),
          apiRequest<any>("/admin/reports?days=30", { token })
        ]);

        setOverview(ov);
        setReports(rep);

        // fetch summary separately for payout total
        try {
          const sum = await apiRequest<any>("/admin/earnings/summary?", { token });
          setEarningsSummary(sum);
        } catch (e) {
          // non-fatal
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load overview");
      }
    };
    void run();
  }, [token]);

  const recentClicksMax = useMemo(() => {
    const rows = overview?.trends.clicksByDay ?? [];
    const last7 = rows.slice(-7);
    return last7.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  }, [overview]);

  const last7Days = useMemo(() => {
    const rows = overview?.trends.clicksByDay ?? [];
    return rows.slice(-7);
  }, [overview]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Admin control center</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Dashboard</h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-400">
          Welcome back. This is your home for running PurpleMerit Links: see how the platform is performing,
          jump into moderation, and understand what happens when users create short links and the world
          clicks them.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!overview && !error ? (
        <p className="text-slate-400">Loading overview…</p>
      ) : null}

      {overview ? (
        <>
          <section aria-label="Key metrics">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Key metrics</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="block rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Total members</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{overview?.totals.users ?? "—"}</p>
                <p className="mt-2 text-xs text-indigo-400">View directory →</p>
              </div>
              <div className="block rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Anonymous users</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{reports?.anonymousSessions ?? "—"}</p>
                <p className="mt-2 text-xs text-indigo-400">Sessions without accounts</p>
              </div>
              <div className="block rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Short links</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{overview?.totals.urls ?? "—"}</p>
                <p className="mt-2 text-xs text-indigo-400">Total short URLs</p>
              </div>
              <div className="block rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Raw clicks</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{overview?.totals.clicks ?? "—"}</p>
                <p className="mt-2 text-xs text-indigo-400">All redirects recorded</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Qualified views</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{overview?.totals.uniqueClicks ?? "—"}</p>
                <p className="mt-2 text-xs text-indigo-400">Validated completions</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Earnings (payout)</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">₹{earningsSummary?.data?.totalEarnings?.toFixed?.(2) ?? (earningsSummary?.data?.totalEarnings ?? "—")}</p>
                <p className="mt-2 text-xs text-indigo-400">Platform payouts</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Gross revenue</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">₹{reports?.revenue?.grossCollected ?? "—"}</p>
                <p className="mt-2 text-xs text-indigo-400">Collections (period)</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-sm text-slate-400">Active links</span>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400">{overview?.totals.activeUrls ?? "—"}</p>
                <p className="mt-2 text-xs text-slate-500">Currently accepting redirects</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 md:p-6">
            <h2 className="text-lg font-semibold text-white">Recent click rhythm (7 days)</h2>
            <p className="mt-1 text-sm text-slate-400">
              A quick pulse check before you open the full{" "}
              <Link className="text-indigo-400 underline hover:text-indigo-300" href="/admin/clicks">
                Clicks
              </Link>{" "}
              page for the 90-day chart.
            </p>
            <div className="mt-5 space-y-2">
              {last7Days.length === 0 ? (
                <p className="text-sm text-slate-500">No clicks recorded in this window yet.</p>
              ) : (
                last7Days.map((row) => (
                  <div className="flex items-center gap-3 text-sm" key={row.date}>
                    <span className="w-20 shrink-0 text-slate-500">
                      {new Date(row.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                    </span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-500/90"
                        style={{ width: `${Math.max(6, (row.count / recentClicksMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right tabular-nums text-slate-300">{row.count}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white">What is this dashboard?</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            PurpleMerit Links is a URL shortener: people paste long URLs, get short codes, and share them
            anywhere. This admin area is separate from the normal user dashboard—it is built for operators who
            keep the product trustworthy, fast, and compliant.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            The numbers above reflect your live database: registered accounts, created short links, and every
            redirect that was counted. They update as real users interact with the product.
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white">What you can do here</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="mt-0.5 text-indigo-400">→</span>
              <span>
                <Link className="font-medium text-white underline-offset-2 hover:underline" href="/admin/users">
                  Users
                </Link>
                — review who is on the platform, spot abuse patterns, and take action when accounts violate your
                policies.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-indigo-400">→</span>
              <span>
                <Link className="font-medium text-white underline-offset-2 hover:underline" href="/admin/urls">
                  All URLs
                </Link>
                — see every short link across all users, pause risky destinations, reactivate safe ones, or
                remove links that should not resolve anymore.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-indigo-400">→</span>
              <span>
                <Link className="font-medium text-white underline-offset-2 hover:underline" href="/admin/clicks">
                  Clicks
                </Link>
                — understand traffic volume over time so you can correlate spikes with launches, incidents, or
                organic growth.
              </span>
            </li>
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-indigo-950/30 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">How it works (in one minute)</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-300">
          <li>
            A user signs up and creates a short link pointing at any valid HTTP(S) destination you allow.
          </li>
          <li>
            Visitors hit your public redirect route; if the link is active, they are sent to the destination and
            a click is logged for analytics.
          </li>
          <li>
            If you pause a link, visitors get a clear “paused” response instead of a blind redirect—useful when
            a destination becomes unsafe or disputed.
          </li>
          <li>
            Admins can always return here to monitor totals, audit URLs, and keep the experience predictable for
            end users.
          </li>
        </ol>
      </section>

      {overview ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white">Platform snapshot</h2>
          <p className="mt-2 text-sm text-slate-400">
            Deeper breakdown of the same overview—handy when you are writing status updates or investigating a
            ticket.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Active users</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-white">{overview.totals.activeUsers}</dd>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Banned users</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-amber-200">{overview.totals.bannedUsers}</dd>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Paused URLs</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-amber-200">{overview.totals.pausedUrls}</dd>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Deleted URLs</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-300">
                {overview.totals.deletedUrls}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Total short links</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-white">{overview.totals.urls}</dd>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Total clicks logged</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-indigo-300">{overview.totals.clicks}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Stay engaged: a simple rhythm</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-medium text-white">Morning glance</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Scan KPIs and the 7-day click strip for anything unusual before you dive into tickets.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-medium text-white">Weekly audit</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Walk <span className="text-slate-200">All URLs</span> sorted by recency or status and clear stale
              or abusive destinations.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-medium text-white">After incidents</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Use <span className="text-slate-200">Clicks</span> to confirm traffic normalized after a pause,
              campaign, or outage.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Trust, transparency, and your users</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          People share short links because they trust your domain. Pausing or removing a link is a strong signal—
          use it deliberately and document why when your team asks later. When in doubt, prefer pausing over
          silent redirects so visitors are not sent somewhere harmful.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Need a break from moderation? The public marketing site is always one tab away—your work here keeps
          that promise credible.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            href="/"
          >
            View public site
          </Link>
          <Link
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            href="/admin/urls"
          >
            Go to All URLs
          </Link>
        </div>
      </section>
    </div>
  );
}
