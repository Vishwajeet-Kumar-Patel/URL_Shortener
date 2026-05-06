"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { PublicLayout } from "@/components/public/public-layout";

type SessionStatus = {
  sessionId: string;
  shortCode: string;
  currentState: string;
  humanVerified: boolean;
  phase1StartedAt: string | null;
  phase1CompletedAt: string | null;
  phase2StartedAt: string | null;
  phase2CompletedAt: string | null;
  sponsorOpenedAt: string | null;
  sponsorVerifiedAt: string | null;
  finalUnlockedAt: string | null;
  canUnlock: boolean;
  sponsorUrl: string;
};

type StepResponse = {
  sessionId: string;
  currentState: string;
  countdownSeconds?: number;
};

const COUNTDOWN_SECONDS = 10;

export default function MonetizeBlogStagePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.step);

  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [phase1SecondsLeft, setPhase1SecondsLeft] = useState<number | null>(null);
  const [phase2SecondsLeft, setPhase2SecondsLeft] = useState<number | null>(null);
  const [phase1InProgress, setPhase1InProgress] = useState(false);
  const [phase2InProgress, setPhase2InProgress] = useState(false);
  const [phase1Completed, setPhase1Completed] = useState(false);
  const [phase2Completed, setPhase2Completed] = useState(false);
  const [lowerCheckpointReached, setLowerCheckpointReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const lowerCheckpointRef = useRef<HTMLDivElement | null>(null);
  const phase1CompleteSent = useRef(false);
  const phase2CompleteSent = useRef(false);

  const phase1Tick = useMemo(() => phase1SecondsLeft ?? COUNTDOWN_SECONDS, [phase1SecondsLeft]);
  const phase2Tick = useMemo(() => phase2SecondsLeft ?? COUNTDOWN_SECONDS, [phase2SecondsLeft]);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiRequest<SessionStatus>(`/public/session/${encodeURIComponent(sessionId)}/status`);
        setStatus(result);

        if (result.phase1StartedAt && !result.phase1CompletedAt) {
          setPhase1InProgress(true);
          setPhase1SecondsLeft(getRemainingSeconds(result.phase1StartedAt));
        }

        if (result.phase1CompletedAt) {
          setPhase1Completed(true);
        }

        if (result.phase2StartedAt && !result.phase2CompletedAt) {
          setPhase2InProgress(true);
          setPhase2SecondsLeft(getRemainingSeconds(result.phase2StartedAt));
        }

        if (result.phase2CompletedAt) {
          setPhase2Completed(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load session state.");
      }
    };

    void load();
  }, [sessionId]);

  useEffect(() => {
    if (phase1InProgress && phase1SecondsLeft !== null && phase1SecondsLeft > 0) {
      const timer = window.setTimeout(() => setPhase1SecondsLeft((value) => (value === null ? null : Math.max(0, value - 1))), 1000);
      return () => window.clearTimeout(timer);
    }

    if (phase1InProgress && phase1SecondsLeft === 0 && !phase1CompleteSent.current) {
      phase1CompleteSent.current = true;
      void completePhase1();
    }
    return undefined;
  }, [phase1InProgress, phase1SecondsLeft]);

  useEffect(() => {
    if (phase2InProgress && phase2SecondsLeft !== null && phase2SecondsLeft > 0) {
      const timer = window.setTimeout(() => setPhase2SecondsLeft((value) => (value === null ? null : Math.max(0, value - 1))), 1000);
      return () => window.clearTimeout(timer);
    }

    if (phase2InProgress && phase2SecondsLeft === 0 && !phase2CompleteSent.current) {
      phase2CompleteSent.current = true;
      void completePhase2();
    }
    return undefined;
  }, [phase2InProgress, phase2SecondsLeft]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLowerCheckpointReached(true);
        }
      },
      { threshold: 0.45 }
    );

    const marker = lowerCheckpointRef.current;
    if (marker) {
      observer.observe(marker);
    }

    return () => observer.disconnect();
  }, []);

  const handleStartPhase1 = async () => {
    setBusyAction("phase1-start");
    setError(null);
    try {
      const result = await apiRequest<StepResponse>(`/public/phase1/start/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase1InProgress(true);
      setPhase1SecondsLeft(result.countdownSeconds ?? COUNTDOWN_SECONDS);
      phase1CompleteSent.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the first verification timer.");
    } finally {
      setBusyAction(null);
    }
  };

  const completePhase1 = async () => {
    try {
      await apiRequest(`/public/phase1/complete/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase1InProgress(false);
      setPhase1SecondsLeft(null);
      setPhase1Completed(true);
    } catch (err) {
      phase1CompleteSent.current = false;
      setError(err instanceof Error ? err.message : "Unable to complete the first verification stage.");
    }
  };

  const handleStartPhase2 = async () => {
    setBusyAction("phase2-start");
    setError(null);
    try {
      const result = await apiRequest<StepResponse>(`/public/phase2/start/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase2InProgress(true);
      setPhase2SecondsLeft(result.countdownSeconds ?? COUNTDOWN_SECONDS);
      phase2CompleteSent.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the second verification timer.");
    } finally {
      setBusyAction(null);
    }
  };

  const completePhase2 = async () => {
    try {
      await apiRequest(`/public/phase2/complete/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase2InProgress(false);
      setPhase2SecondsLeft(null);
      setPhase2Completed(true);
    } catch (err) {
      phase2CompleteSent.current = false;
      setError(err instanceof Error ? err.message : "Unable to complete the second verification stage.");
    }
  };

  const handleScrollPrompt = () => {
    lowerCheckpointRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleProceedToSponsor = () => {
    router.push(`/monetize/sponsor/${encodeURIComponent(sessionId)}`);
  };

  const stickyLabel = (() => {
    if (phase1InProgress) return `Verifying... ${phase1Tick}s`;
    if (!phase1Completed) return "Verify Link";
    if (!lowerCheckpointReached) return "Scroll Down To Continue";
    if (phase2InProgress) return `Opening next layer... ${phase2Tick}s`;
    if (!phase2Completed) return "Open Next Verification";
    return "Proceed To Sponsor";
  })();

  const stickyAction = (() => {
    if (phase1InProgress) return undefined;
    if (!phase1Completed) return handleStartPhase1;
    if (!lowerCheckpointReached) return handleScrollPrompt;
    if (phase2InProgress) return undefined;
    if (!phase2Completed) return handleStartPhase2;
    return handleProceedToSponsor;
  })();

  return (
    <PublicLayout>
      <main className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.96),_rgba(2,6,23,1)_64%)] text-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="sticky top-[68px] z-30 mb-6 rounded-2xl border border-cyan-500/20 bg-slate-950/90 px-4 py-3 shadow-lg shadow-slate-950/30 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/70">Monetized editorial funnel</p>
                <p className="mt-1 text-sm text-slate-300">
                  Session {sessionId} · {status?.currentState ?? "Loading state"}
                </p>
              </div>
              <button
                type="button"
                onClick={stickyAction}
                disabled={!stickyAction || busyAction !== null}
                className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {busyAction ? "Working…" : stickyLabel}
              </button>
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-7">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
                <img
                  alt="Editorial workspace and analytics board"
                  className="h-72 w-full object-cover"
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop"
                />
              </div>

              <header className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/70">Featured guide</p>
                <h1 className="max-w-4xl text-3xl font-semibold text-white sm:text-4xl">
                  Why premium traffic flows now depend on verified attention, not blind redirects
                </h1>
                <p className="max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
                  This long-form public page is intentionally structured like a professional SaaS blog. It introduces the
                  monetization logic, places high-quality ad inventory inside useful content, and keeps the destination locked
                  until the full verification sequence completes.
                </p>
              </header>

              <BannerAd label="Top banner inventory" />

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-6 text-slate-300">
                  <p>
                    The first layer establishes human intent. A visitor manually confirms they are not a robot, which starts a
                    server-bound countdown rather than a hidden automatic timer. This keeps the experience transparent while
                    preserving the monetization gate.
                  </p>
                  <h2 className="text-2xl font-semibold text-white">Structured content that supports revenue without looking like a redirect stub</h2>
                  <p>
                    Product teams and publishers often lose trust when a short link feels like a blank intermediary page. This
                    implementation keeps the brand, footer, and navigation visible, and surrounds the verification controls with
                    real editorial content, images, and ad placements.
                  </p>
                  <BannerAd label="Mid-article sponsorship" compact />
                  <p>
                    Every click is logged immediately when the short link is opened. Qualified revenue, however, only posts when
                    the final unlock succeeds. That distinction keeps raw traffic and monetized completions separate for analytics
                    and payout accuracy.
                  </p>
                  <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
                    <img
                      alt="Team reviewing growth metrics"
                      className="h-64 w-full object-cover"
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop"
                    />
                  </div>
                  <p>
                    The editorial sequence below continues the same visual language, while the sticky CTA ribbon follows the
                    visitor with the next required action. Nothing auto-starts. Each timer starts only after a deliberate click.
                  </p>
                </div>

                <aside className="space-y-4">
                  <div className="sticky top-28 rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Visitor pulse</p>
                    <div className="mt-4 space-y-3">
                      <Metric label="Human verification" value={status?.humanVerified ? "Confirmed" : "Pending"} />
                      <Metric label="Phase 1" value={phase1Completed ? "Complete" : phase1InProgress ? `${phase1Tick}s` : "Waiting"} />
                      <Metric label="Phase 2" value={phase2Completed ? "Complete" : phase2InProgress ? `${phase2Tick}s` : "Waiting"} />
                      <Metric label="Sponsor" value={status?.sponsorOpenedAt ? "Opened" : "Locked"} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-4 text-sm leading-6 text-slate-300">
                      The sidebar stays visible so the visitor always sees the next required action while reading the article.
                    </div>
                  </div>
                </aside>
              </div>

              <div ref={lowerCheckpointRef} className="space-y-6 pt-10">
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/70">Lower checkpoint</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">The second article layer introduces the sponsor path</h2>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                    At this checkpoint the visitor has already engaged with the top article, waited through the first countdown,
                    and scrolled far enough to reveal the second block. The CTA now shifts to the next verification phase.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-6 text-slate-300">
                    <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
                      <img
                        alt="Conference room during a sponsor presentation"
                        className="h-72 w-full object-cover"
                        src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop"
                      />
                    </div>
                    <p>
                      The second verification phase confirms sustained attention. It starts only after the user clicks the CTA,
                      and it completes with another server-validated timestamp before the sponsor step becomes available.
                    </p>
                    <h3 className="text-xl font-semibold text-white">Embedded video ad placeholder</h3>
                    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                      <div className="aspect-video rounded-2xl border border-dashed border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                        <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-400">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Video ad inventory</p>
                          <p className="mt-2 max-w-md">
                            Connect your sponsored video slot or demand partner here. The layout is reserved for monetized traffic.
                          </p>
                        </div>
                      </div>
                    </div>
                    <BannerAd label="Sponsor banner" compact />
                    <p>
                      Once the second timer completes, the button below will unlock the sponsor page. That page handles the
                      outbound visit and the final confirmation that the sponsor was actually visited.
                    </p>
                  </div>

                  <aside className="space-y-4">
                    <div className="sticky top-28 rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Progress control</p>
                      <div className="mt-3 space-y-3 text-sm text-slate-300">
                        <p>1. Verify human manually.</p>
                        <p>2. Start phase 1 timer.</p>
                        <p>3. Scroll to this checkpoint.</p>
                        <p>4. Start phase 2 timer.</p>
                        <p>5. Continue to sponsor verification.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleProceedToSponsor}
                        disabled={!phase2Completed}
                        className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                      >
                        {phase2Completed ? "Proceed To Sponsor" : "Waiting for phase 2"}
                      </button>
                    </div>
                  </aside>
                </div>
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              ) : null}
            </article>

            <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Content cards</p>
              <CardBlock
                title="Audience quality"
                body="The funnel keeps qualified completions separate from raw opens so member and admin revenue remain accurate."
              />
              <CardBlock
                title="Brand consistency"
                body="The public header, footer, and colors remain consistent with the homepage instead of appearing like a blank redirect page."
              />
              <CardBlock
                title="Ad engagement"
                body="Banner, sticky, and video placeholder placements are reserved for sponsor inventory and future demand partners."
              />
              <CardBlock
                title="Session binding"
                body="The backend validates each state transition with timestamps before unlock, preventing skipped steps or direct destination access."
              />
            </aside>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}

function getRemainingSeconds(startedAt: string) {
  const elapsedSeconds = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, COUNTDOWN_SECONDS - Math.floor(elapsedSeconds));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function BannerAd({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-950/70 ${compact ? "p-4" : "p-5"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <div className={`mt-3 rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 ${compact ? "px-4 py-5" : "px-5 py-8"}`}>
        <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
          <span>Sponsored placement</span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-200">
            Reserved
          </span>
        </div>
      </div>
    </div>
  );
}

function CardBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
