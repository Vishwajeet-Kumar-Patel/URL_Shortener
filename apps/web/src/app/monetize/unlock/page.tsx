"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type StatusResponse = {
  isComplete: boolean;
  isQualified: boolean;
  currentStep: number;
  sponsorClicked: boolean;
};

type CompletionResponse = {
  redirectUrl: string;
  amount: number;
  currency: string;
};

const buildFingerprint = () => {
  if (typeof window === "undefined") return "server";
  return [navigator.userAgent, navigator.language, String(screen.width), String(screen.height)].join("|");
};

export default function MonetizeUnlockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <MonetizeUnlockContent />
    </Suspense>
  );
}

function MonetizeUnlockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionToken = String(searchParams.get("rs") ?? "");
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fingerprint = useMemo(() => buildFingerprint(), []);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiRequest<StatusResponse>(`/public/session/${encodeURIComponent(sessionToken)}/status`);
        setStatus(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load unlock status.");
      }
    };

    void load();
  }, [sessionToken]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const handleUnlock = async () => {
    setBusy(true);
    try {
      const validation = await apiRequest<{ isValid: boolean; nextStep: number; message?: string }>(
        `/public/funnel/validate/${encodeURIComponent(sessionToken)}`,
        {
          method: "POST",
          body: {
            sessionToken,
            currentStep: 4,
            fingerprint
          }
        }
      );

      if (!validation.isValid) {
        throw new Error(validation.message ?? "Unlock validation failed.");
      }

      const result = await apiRequest<CompletionResponse>(`/public/complete/${encodeURIComponent(sessionToken)}`, {
        method: "POST",
        body: { fingerprint }
      });
      window.location.href = result.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock destination.");
      setBusy(false);
    }
  };

  const canUnlock = Boolean(status?.sponsorClicked && secondsLeft <= 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/70">Final unlock</p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Reward verification</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            The sponsor step is complete, the funnel state is server-validated, and the final unlock countdown is now running.
            The original destination will only be returned after this final confirmation.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card label="Session" value={status ? `Step ${status.currentStep}` : "Loading"} />
            <Card label="Sponsor" value={status?.sponsorClicked ? "Confirmed" : "Pending"} />
            <Card label="Timer" value={`${secondsLeft}s`} />
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm leading-6 text-emerald-50">
            This page never displays the final destination in the HTML. Only the backend can provide it when the unlock is approved.
          </div>

          {error ? <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

          <button
            type="button"
            onClick={handleUnlock}
            disabled={!canUnlock || busy}
            className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {busy ? "Unlocking…" : canUnlock ? "Unlock Destination" : "Waiting for verification"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Return home
          </button>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
