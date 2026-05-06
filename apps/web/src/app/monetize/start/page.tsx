"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type ProgressResponse = {
  isValid: boolean;
  nextStep: number;
  message?: string;
  nextRoute?: string;
};

const buildFingerprint = () => {
  if (typeof window === "undefined") return "server";
  return [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0)
  ].join("|");
};

export default function MonetizeStartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <MonetizeStartContent />
    </Suspense>
  );
}

function MonetizeStartContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionToken = String(searchParams.get("rs") ?? "");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fingerprint = useMemo(() => buildFingerprint(), []);

  useEffect(() => {
    if (!captchaVerified) return;

    if (secondsLeft <= 0) {
      setReady(true);
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [captchaVerified, secondsLeft]);

  const handleContinue = async () => {
    try {
      const result = await apiRequest<ProgressResponse>(`/public/funnel/validate/${encodeURIComponent(sessionToken)}`, {
        method: "POST",
        body: {
          sessionToken,
          currentStep: 0,
          ctaClicked: true,
          fingerprint
        }
      });

      if (result.isValid) {
        router.push(`/monetize/blog/1?rs=${encodeURIComponent(sessionToken)}`);
        return;
      }

      throw new Error(result.message ?? "Unable to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/70">Stage 0</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Preparing your destination</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                This session is being validated before the content journey begins. A signed token is bound to this visit,
                and the final destination remains locked until the full monetization funnel is completed.
              </p>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Captcha verification</span>
                  <button
                    type="button"
                    onClick={() => setCaptchaVerified(true)}
                    className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 hover:bg-cyan-400"
                  >
                    Verify human
                  </button>
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-400">
                  Verification starts the countdown. The continue control only appears after the timer completes.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Metric label="Session lock" value="Signed" />
                <Metric label="Timer" value={`${secondsLeft}s`} />
                <Metric label="Ad slot" value="Reserved" />
              </div>

              {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            </div>

            <aside className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Preparing your path</p>
              <div className="mt-4 space-y-4">
                <Panel label="Destination protection" value="Enabled" />
                <Panel label="Visitor fingerprint" value={fingerprint.slice(0, 16) + "…"} />
                <Panel label="Final URL disclosure" value="Blocked" />
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">
                The funnel uses staged validation for traffic quality, unique visitor gating, and member payout calculation.
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!ready}
                className="mt-6 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {ready ? "Continue to Blog Layer 1" : "Waiting for verification"}
              </button>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Panel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
