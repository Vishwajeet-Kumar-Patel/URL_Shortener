"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api-client";

const buildFingerprint = () => {
  if (typeof window === "undefined") return "server";
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0)
  ];
  return parts.join("|");
};

export default function VisitShortCodePage() {
  const params = useParams();
  const router = useRouter();
  const shortCode = String(params.shortCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fingerprint = useMemo(() => buildFingerprint(), []);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/visit/${encodeURIComponent(shortCode)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsEnabled: true,
            cookiesEnabled: navigator.cookieEnabled,
            fingerprint
          })
        });

        const payload = (await response.json()) as {
          success: boolean;
          data?: { sessionToken: string; nextRoute: string };
          message?: string;
        };

        if (!response.ok || !payload.success || !payload.data?.sessionToken) {
          throw new Error(payload.message ?? "Unable to prepare this visit.");
        }

        router.replace(payload.data.nextRoute || `/monetize/start?rs=${encodeURIComponent(payload.data.sessionToken)}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to start the monetized visit.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [fingerprint, router, shortCode]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.9),_rgba(2,6,23,1)_52%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/70">Preparing visit</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Preparing your destination flow</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            We are validating the short link and setting up a signed redirect session before the monetized journey begins.
          </p>

          <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400" />
            </div>
            <p className="mt-4 text-sm text-slate-300">Security checks, session binding, and visitor fingerprinting in progress.</p>
          </div>

          {loading ? <p className="mt-6 text-sm text-slate-400">Please wait…</p> : null}
          {error ? <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
