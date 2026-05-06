"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { PublicLayout } from "@/components/public/public-layout";

type SessionStatus = {
  sessionId: string;
  currentState: string;
  humanVerified: boolean;
  phase1CompletedAt: string | null;
  phase2CompletedAt: string | null;
  sponsorOpenedAt: string | null;
  sponsorVerifiedAt: string | null;
  finalUnlockedAt: string | null;
  canUnlock: boolean;
};

type UnlockResponse = {
  redirectUrl: string;
  amount: number;
  adminAmount: number;
  currency: string;
};

const COUNTDOWN_SECONDS = 10;

export default function MonetizeUnlockPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);

  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiRequest<SessionStatus>(
          `/public/session/${encodeURIComponent(sessionId)}/status`
        );
        setStatus(result);

        // Only start countdown if already verified by sponsor step
        if (result.sponsorVerifiedAt) {
          setSecondsLeft(COUNTDOWN_SECONDS);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load unlock status.");
      }
    };

    void load();
  }, [sessionId]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const timer = window.setTimeout(
      () => setSecondsLeft((value) => (value === null ? null : Math.max(0, value - 1))),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const handleUnlock = async () => {
    if (!status?.canUnlock) {
      setError("All verification steps must be complete before unlock.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<UnlockResponse>(
        `/public/unlock/${encodeURIComponent(sessionId)}`,
        { method: "POST" }
      );

      setFinished(true);
      // Redirect to final destination after a brief delay
      setTimeout(() => {
        window.location.href = result.redirectUrl;
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock destination.");
      setBusy(false);
    }
  };

  const canUnlock = Boolean(
    status?.canUnlock &&
      status?.sponsorVerifiedAt &&
      secondsLeft !== null &&
      secondsLeft <= 0 &&
      !busy &&
      !finished
  );

  return (
    <PublicLayout>
      <main className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)] text-slate-100">
        <div className="mx-auto flex min-h-[calc(100vh-145px)] max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <section className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/70">
              Step 5 · Final unlock
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Reward verification</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              The sponsor step is complete, the funnel state is server-validated, and the final unlock
              countdown is now running. The original destination will only be returned after this final
              confirmation.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card
                label="State"
                value={
                  status?.finalUnlockedAt ? "Unlocked" : status?.canUnlock ? "Ready" : "Processing"
                }
              />
              <Card
                label="Sponsor"
                value={status?.sponsorVerifiedAt ? "Verified" : "Pending"}
              />
              <Card label="Timer" value={`${secondsLeft ?? COUNTDOWN_SECONDS}s`} />
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm leading-6 text-emerald-50">
              This page never displays the final destination in the HTML. Only the backend can provide
              it when the unlock is approved.
            </div>

            {error ? (
              <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            {finished ? (
              <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Redirecting to destination…
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleUnlock}
              disabled={!canUnlock || busy || finished}
              className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {finished
                ? "Redirecting…"
                : busy
                  ? "Unlocking…"
                  : canUnlock
                    ? "Unlock Destination"
                    : "Waiting for verification"}
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
    </PublicLayout>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
