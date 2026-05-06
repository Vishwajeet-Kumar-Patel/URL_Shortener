"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { PublicLayout } from "@/components/public/public-layout";

type SessionStatus = {
  currentState: string;
  sponsorUrl: string;
  sponsorOpenedAt: string | null;
  sponsorVerifiedAt: string | null;
};

type SponsorOpenResponse = {
  sessionId: string;
  currentState: string;
  sponsorUrl: string;
};

type SponsorVerifyResponse = {
  sessionId: string;
  currentState: string;
  countdownSeconds: number;
};

const COUNTDOWN_SECONDS = 10;

export default function SponsorPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);

  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [sponsorOpened, setSponsorOpened] = useState(false);
  const [visitedSponsor, setVisitedSponsor] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiRequest<SessionStatus>(`/public/session/${encodeURIComponent(sessionId)}/status`);
        setStatus(result);
        setSponsorOpened(Boolean(result.sponsorOpenedAt));
        setVisitedSponsor(Boolean(result.sponsorVerifiedAt));
        if (result.sponsorVerifiedAt) {
          setSecondsLeft(COUNTDOWN_SECONDS);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load sponsor state.");
      }
    };

    void load();
  }, [sessionId]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => (value === null ? null : Math.max(0, value - 1))), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const openSponsor = async () => {
    setBusy("open");
    setError(null);
    try {
      const result = await apiRequest<SponsorOpenResponse>(`/public/sponsor/open/${encodeURIComponent(sessionId)}`, {
        method: "POST"
      });
      window.open(result.sponsorUrl, "_blank", "noopener,noreferrer");
      setSponsorOpened(true);
      setStatus((value) =>
        value
          ? {
              ...value,
              sponsorUrl: result.sponsorUrl,
              sponsorOpenedAt: value.sponsorOpenedAt ?? new Date().toISOString()
            }
          : value
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open sponsor.");
    } finally {
      setBusy(null);
    }
  };

  const verifySponsor = async () => {
    setBusy("verify");
    setError(null);
    try {
      const result = await apiRequest<SponsorVerifyResponse>(`/public/sponsor/verify/${encodeURIComponent(sessionId)}`, {
        method: "POST"
      });
      setVisitedSponsor(true);
      setSecondsLeft(result.countdownSeconds ?? COUNTDOWN_SECONDS);
      setStatus((value) => (value ? { ...value, sponsorVerifiedAt: new Date().toISOString() } : value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify the sponsor visit.");
    } finally {
      setBusy(null);
    }
  };

  const handleContinue = () => {
    router.push(`/monetize/unlock/${encodeURIComponent(sessionId)}`);
  };

  const canContinue = visitedSponsor && (secondsLeft ?? 0) <= 0;

  return (
    <PublicLayout>
      <main className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.96),_rgba(2,6,23,1)_64%)] text-slate-100">
        <div className="mx-auto flex min-h-[calc(100vh-145px)] max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <section className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
            <div className="space-y-5">
              <p className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                Step 4 · Sponsor verification
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Complete sponsor verification to continue</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                This step opens the sponsor destination in a new tab, then holds the current tab on a verification screen
                until the visitor confirms they actually visited the offer and waits through the final countdown.
              </p>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-inner shadow-slate-950/20">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-300 to-cyan-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Outbound visit is required</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      Open the sponsor, return here, and click the confirmation button to start the final unlock timer.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openSponsor}
                  disabled={busy !== null}
                  className="mt-6 w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {busy === "open" ? "Opening sponsor…" : "Proceed To Sponsor"}
                </button>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  {sponsorOpened ? (
                    <p>Sponsor opened. Confirm the visit below to continue.</p>
                  ) : (
                    <p>The sponsor tab has not been opened yet. Use the primary button above first.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={verifySponsor}
                  disabled={!sponsorOpened || busy !== null}
                  className="mt-5 w-full rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {busy === "verify" ? "Verifying…" : "I Have Visited Sponsor"}
                </button>

                {visitedSponsor ? (
                  <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
                    Final countdown running: {secondsLeft ?? COUNTDOWN_SECONDS}s remaining.
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="mt-5 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {canContinue ? "Continue To Unlock" : "Waiting for verification"}
                </button>
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              ) : null}
            </div>

            <aside className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Sponsor preview</p>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <img
                  alt="Luxury product marketing scene"
                  className="h-56 w-full object-cover"
                  src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop"
                />
              </div>
              <div className="space-y-3">
                <Stat label="Sponsor URL" value={status?.sponsorUrl ? "Configured" : "Loading"} />
                <Stat label="Opened" value={sponsorOpened ? "Yes" : "No"} />
                <Stat label="Visited" value={visitedSponsor ? "Confirmed" : "Pending"} />
                <Stat label="Countdown" value={`${secondsLeft ?? COUNTDOWN_SECONDS}s`} />
              </div>
              <div className="rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/5 p-4 text-sm leading-6 text-slate-300">
                The current tab stays on this verification page while the sponsor opens in a new tab.
              </div>
            </aside>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
