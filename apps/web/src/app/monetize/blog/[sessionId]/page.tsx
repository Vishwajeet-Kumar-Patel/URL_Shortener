"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { PublicLayout } from "@/components/public/public-layout";

type StepResponse = { countdownSeconds?: number };

type SessionStatus = {
  phase1CompletedAt: string | null;
  phase2CompletedAt: string | null;
  sponsorVerifiedAt: string | null;
  finalUnlockedAt: string | null;
};

export default function UnifiedBlogPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);

  // State for each phase
  const [phase1Seconds, setPhase1Seconds] = useState<number | null>(null);
  const [phase1InProgress, setPhase1InProgress] = useState(false);
  const [phase1Completed, setPhase1Completed] = useState(false);
  const [phase1Busy, setPhase1Busy] = useState(false);
  const [phase1Ready, setPhase1Ready] = useState(false);

  const [phase2Seconds, setPhase2Seconds] = useState<number | null>(null);
  const [phase2InProgress, setPhase2InProgress] = useState(false);
  const [phase2Completed, setPhase2Completed] = useState(false);
  const [phase2Busy, setPhase2Busy] = useState(false);
  const [phase2Ready, setPhase2Ready] = useState(false);

  const [phase3Seconds, setPhase3Seconds] = useState<number | null>(null);
  const [phase3InProgress, setPhase3InProgress] = useState(false);
  const [phase3Completed, setPhase3Completed] = useState(false);
  const [phase3Ready, setPhase3Ready] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const phase1Ref = useRef<HTMLDivElement | null>(null);
  const phase2Ref = useRef<HTMLDivElement | null>(null);
  const phase3Ref = useRef<HTMLDivElement | null>(null);

  const phase1CompleteSent = useRef(false);
  const phase2CompleteSent = useRef(false);

  const phase1Tick = useMemo(() => phase1Seconds ?? 0, [phase1Seconds]);
  const phase2Tick = useMemo(() => phase2Seconds ?? 0, [phase2Seconds]);
  const phase3Tick = useMemo(() => phase3Seconds ?? 0, [phase3Seconds]);

  // Load initial session state
  useEffect(() => {
    const load = async () => {
      try {
        const status = await apiRequest<SessionStatus>(`/public/session/${encodeURIComponent(sessionId)}/status`);
        
        if (status.phase1CompletedAt) {
          setPhase1Completed(true);
        }
        if (status.phase2CompletedAt) {
          setPhase2Completed(true);
        }
        if (status.finalUnlockedAt) {
          setPhase3Completed(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load session state.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [sessionId]);

  // Phase 1 countdown
  useEffect(() => {
    if (phase1InProgress && phase1Seconds !== null && phase1Seconds > 0) {
      const timer = window.setTimeout(() => setPhase1Seconds((v) => (v === null ? null : Math.max(0, v - 1))), 1000);
      return () => window.clearTimeout(timer);
    }

    if (phase1InProgress && phase1Seconds === 0 && !phase1CompleteSent.current) {
      // mark ready and stop the in-progress state; require a manual click to complete
      phase1CompleteSent.current = true;
      setPhase1InProgress(false);
      setPhase1Seconds(null);
      setPhase1Ready(true);
    }
    return undefined;
  }, [phase1InProgress, phase1Seconds]);

  // Phase 2 countdown
  useEffect(() => {
    if (phase2InProgress && phase2Seconds !== null && phase2Seconds > 0) {
      const timer = window.setTimeout(() => setPhase2Seconds((v) => (v === null ? null : Math.max(0, v - 1))), 1000);
      return () => window.clearTimeout(timer);
    }

    if (phase2InProgress && phase2Seconds === 0 && !phase2CompleteSent.current) {
      // require manual confirmation after timer finishes
      phase2CompleteSent.current = true;
      setPhase2InProgress(false);
      setPhase2Seconds(null);
      setPhase2Ready(true);
    }
    return undefined;
  }, [phase2InProgress, phase2Seconds]);

  // Phase 3 countdown (client-side only)
  useEffect(() => {
    if (phase3InProgress && phase3Seconds !== null && phase3Seconds > 0) {
      const timer = window.setTimeout(() => setPhase3Seconds((v) => (v === null ? null : Math.max(0, v - 1))), 1000);
      return () => window.clearTimeout(timer);
    }

    if (phase3InProgress && phase3Seconds === 0 && !phase3Completed) {
      // Stop progress and enable manual proceed to sponsor
      setPhase3InProgress(false);
      setPhase3Seconds(null);
      setPhase3Ready(true);
    }
    return undefined;
  }, [phase3InProgress, phase3Seconds, phase3Completed, sessionId, router]);

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const startPhase1 = async () => {
    setPhase1Busy(true);
    try {
      const res = await apiRequest<StepResponse>(`/public/phase1/start/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase1Seconds(res.countdownSeconds ?? 10);
      setPhase1InProgress(true);
      scrollToRef(phase1Ref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start phase 1.");
    } finally {
      setPhase1Busy(false);
    }
  };

  const completePhase1 = async () => {
    try {
      await apiRequest(`/public/phase1/complete/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase1InProgress(false);
      setPhase1Seconds(null);
      setPhase1Completed(true);
      scrollToRef(phase2Ref);
    } catch (err) {
      phase1CompleteSent.current = false;
      setError(err instanceof Error ? err.message : "Unable to complete phase 1.");
    }
  };

  const startPhase2 = async () => {
    setPhase2Busy(true);
    try {
      const res = await apiRequest<StepResponse>(`/public/phase2/start/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase2Seconds(res.countdownSeconds ?? 10);
      setPhase2InProgress(true);
      phase2CompleteSent.current = false;
      scrollToRef(phase2Ref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start phase 2.");
    } finally {
      setPhase2Busy(false);
    }
  };

  const completePhase2 = async () => {
    try {
      await apiRequest(`/public/phase2/complete/${encodeURIComponent(sessionId)}`, { method: "POST" });
      setPhase2InProgress(false);
      setPhase2Seconds(null);
      setPhase2Completed(true);
      scrollToRef(phase3Ref);
    } catch (err) {
      phase2CompleteSent.current = false;
      setError(err instanceof Error ? err.message : "Unable to complete phase 2.");
    }
  };

  const startPhase3 = () => {
    setPhase3Seconds(10);
    setPhase3InProgress(true);
    scrollToRef(phase3Ref);
  };

  const proceedToSponsor = () => {
    setPhase3Completed(true);
    router.push(`/monetize/sponsor/${encodeURIComponent(sessionId)}`);
  };

  return (
    <PublicLayout>
      <main className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.96),_rgba(2,6,23,1)_64%)] text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-10">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-sm text-slate-400">Loading session…</p>
            </div>
          ) : (
            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              {/* PHASE 1 SECTION */}
              <div ref={phase1Ref} className="scroll-mt-4 border-b border-white/10 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-400">Session {sessionId}</p>
                    <p className="text-sm text-slate-300">Phase 1 · Introductory article</p>
                  </div>
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      phase1Completed 
                        ? "bg-green-400/10 text-green-200" 
                        : phase1InProgress 
                        ? "bg-cyan-400/10 text-cyan-200" 
                        : "bg-slate-700/40 text-slate-400"
                    }`}>
                      {phase1Completed ? "Complete" : phase1InProgress ? "In Progress" : "Waiting"}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <img alt="Hero" className="h-64 w-full object-cover" src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">The Evolution of Digital Marketing: Understanding Verified Attention in Modern Campaigns</h2>
                  
                  <p className="text-slate-300 leading-relaxed">
                    The digital marketing landscape has undergone a seismic shift over the past decade. What once seemed like a straightforward exchange of attention for content has now become a complex ecosystem where authenticity, verification, and genuine user engagement hold unprecedented value. Today's marketers face a critical challenge: distinguishing between passive impressions and genuine, verified attention from real human audiences.
                  </p>

                  <AdPlacement
                    eyebrow="Premium Ad Space"
                    title="Featured Partner Placement"
                    description="High-intent readers see this premium slot after the opening sections."
                    tone="cyan"
                    imageUrl="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop"
                  />

                  <p className="text-slate-300 leading-relaxed">
                    In an era of ad blockers, cookie restrictions, and increasing skepticism toward digital advertising, brands are desperately searching for ways to reach audiences who genuinely want to hear their message. The old playbook of interruption-based advertising—pop-ups, auto-playing videos, intrusive banner placements—has become increasingly ineffective. Users have become adept at tuning out noise, and algorithms have become sophisticated enough to detect and suppress low-engagement content.
                  </p>

                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <img alt="Digital Analytics" className="h-48 w-full object-cover" src="https://images.unsplash.com/photo-1460925895917-adf4e565db18?q=80&w=1600&auto=format&fit=crop" />
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    This is where verified attention becomes transformative. When a user manually confirms their intention to engage with content, when they wait through a legitimate verification process, when they choose to continue reading rather than abandon the experience—that's real signal. That's the difference between a passive impression and genuine interest. Marketers who can tap into this verified attention are unlocking a goldmine of high-intent audience data.
                  </p>

                  <AdPlacement
                    eyebrow="Mid-Content Sponsorship"
                    title="Brand Integration Opportunity"
                    description="A native slot for sponsored messages that feels integrated with the article flow."
                    tone="indigo"
                    imageUrl="https://images.unsplash.com/photo-1460925895917-adf4e565db18?q=80&w=1600&auto=format&fit=crop"
                  />

                  <CTA 
                    label={phase1InProgress ? `Verifying… ${phase1Tick}s` : !phase1Completed ? "Verify Link" : "Verified"}
                    onClick={startPhase1}
                    disabled={phase1InProgress || phase1Busy || phase1Completed || phase1Ready}
                  />
                  {phase1Ready && !phase1Completed ? (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          void completePhase1();
                          setPhase1Ready(false);
                        }}
                        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                      >
                        Continue Reading
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* PHASE 2 SECTION - Locked until Phase 1 completes */}
              <div 
                ref={phase2Ref} 
                className={`scroll-mt-4 border-b border-white/10 p-6 sm:p-8 ${
                  phase1Completed
                    ? "bg-transparent"
                    : "bg-yellow-950/10"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-400">Session {sessionId}</p>
                    <p className="text-sm text-slate-300">Phase 2 · Second article section</p>
                  </div>
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      phase2Completed 
                        ? "bg-green-400/10 text-green-200" 
                        : phase2InProgress 
                        ? "bg-cyan-400/10 text-cyan-200" 
                        : phase1Completed
                        ? "bg-slate-700/40 text-slate-400"
                        : "bg-yellow-600/40 text-yellow-300"
                    }`}>
                      {phase2Completed ? "Complete" : phase2InProgress ? "In Progress" : phase1Completed ? "Waiting" : "Locked"}
                    </span>
                  </div>
                </div>

                {phase1Completed ? (
                  <div className="space-y-6">
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <img alt="Strategy Discussion" className="h-64 w-full object-cover" src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white">Monetization Strategies: Turning Attention Into Sustainable Revenue Models</h2>
                    
                    <p className="text-slate-300 leading-relaxed">
                      The monetization landscape for digital publishers has fractured into a thousand different directions. From traditional CPM-based display advertising to subscription models, affiliate commissions, sponsored content, and direct partnerships, publishers today must navigate an increasingly complex terrain. Yet few have found the optimal balance between revenue generation and user experience.
                    </p>

                    <AdPlacement
                      eyebrow="Video Ad Placement"
                      title="Premium Video Content Zone"
                      description="A taller sponsor module for video, product demos, or embedded brand stories."
                      tone="purple"
                      imageUrl="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop"
                    />

                    <p className="text-slate-300 leading-relaxed">
                      The challenge intensifies when you consider audience quality. Not all traffic is created equal. A hundred passive viewers scrolling mindlessly through content generate far less revenue than ten verified, engaged readers who have intentionally chosen to spend time with your material. This fundamental insight has driven a revolution in how forward-thinking publishers approach monetization.
                    </p>

                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <img alt="Revenue Growth" className="h-48 w-full object-cover" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop" />
                    </div>

                    <p className="text-slate-300 leading-relaxed">
                      Verification-based models create a virtuous cycle. When you implement a verification gate before showing content, several things happen simultaneously: first, you eliminate the lowest-intent traffic—people who are just bouncing around. Second, you gather signal about who's genuinely interested. Third, you create legitimate opportunities for premium advertisers to connect with engaged audiences. This isn't intrusive advertising; it's audience quality assurance.
                    </p>

                    <p className="text-slate-300 leading-relaxed">
                      Revenue-per-impression metrics improve dramatically in this environment. Brands recognize the value of reaching a verified, attention-engaged audience and are willing to pay premiums. Publishers see improved conversion rates on sponsored content because the audience has already demonstrated commitment by completing verification. Everyone wins.
                    </p>

                    <AdPlacement
                      eyebrow="Content Sponsor Placement"
                      title="Partner Content & Solutions"
                      description="A sponsor row that stays visually aligned with the editorial tone."
                      tone="emerald"
                      imageUrl="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop"
                    />

                    <CTA 
                      label={phase2InProgress ? `Verifying… ${phase2Tick}s` : !phase2Completed ? "Unlock Next Section" : "Section Unlocked"}
                      onClick={startPhase2}
                      disabled={phase2InProgress || phase2Busy || phase2Completed || phase2Ready}
                    />
                    {phase2Ready && !phase2Completed ? (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            void completePhase2();
                            setPhase2Ready(false);
                          }}
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                        >
                          Continue Reading
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-950/30 p-6 text-center">
                    <p className="text-sm font-medium text-yellow-200">Complete Phase 1 first</p>
                    <p className="mt-2 text-xs text-yellow-300">You must finish the first verification to unlock this section.</p>
                  </div>
                )}
              </div>

              {/* PHASE 3 SECTION - Locked until Phase 2 completes */}
              <div 
                ref={phase3Ref} 
                className={`scroll-mt-4 p-6 sm:p-8 ${
                  phase2Completed
                    ? "border-b-0 bg-transparent"
                    : "border-b-0 bg-yellow-950/10"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-400">Session {sessionId}</p>
                    <p className="text-sm text-slate-300">Phase 3 · Final article section</p>
                  </div>
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      phase3Completed 
                        ? "bg-green-400/10 text-green-200" 
                        : phase3InProgress 
                        ? "bg-cyan-400/10 text-cyan-200" 
                        : phase2Completed
                        ? "bg-slate-700/40 text-slate-400"
                        : "bg-yellow-600/40 text-yellow-300"
                    }`}>
                      {phase3Completed ? "Complete" : phase3InProgress ? "In Progress" : phase2Completed ? "Waiting" : "Locked"}
                    </span>
                  </div>
                </div>

                {phase2Completed ? (
                  <div className="space-y-6">
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <img alt="Future Innovation" className="h-64 w-full object-cover" src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white">The Future of Publisher Monetization: Building Sustainable Direct Revenue Streams</h2>
                    
                    <p className="text-slate-300 leading-relaxed">
                      As the digital advertising ecosystem matures, publishers face an unavoidable truth: relying solely on display advertising networks is a precarious position. Platform algorithm changes, privacy regulation shifts, and market saturation have all conspired to compress traditional CPM rates to unsustainable levels. Forward-thinking publishers are building direct monetization strategies that create lasting business resilience.
                    </p>

                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <img alt="Innovation Lab" className="h-48 w-full object-cover" src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1600&auto=format&fit=crop" />
                    </div>

                    <p className="text-slate-300 leading-relaxed">
                      Verification-based monetization creates a foundation for these direct relationships. When your audience has confirmed their humanity, expressed genuine interest, and proven willingness to engage with gated content, you've created a high-value audience segment. This opens doors to premium partnerships, exclusive sponsorships, and direct advertiser relationships that traditional networks can't facilitate.
                    </p>

                    <AdPlacement
                      eyebrow="Exclusive Sponsor Zone"
                      title="Premium Advertiser Partnership"
                      description="A high-value sponsor insertion for premium campaigns and direct deals."
                      tone="rose"
                      imageUrl="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1600&auto=format&fit=crop"
                    />

                    <p className="text-slate-300 leading-relaxed">
                      The data you accumulate through verification gates becomes invaluable. You learn which topics drive engagement, which audiences are most valuable, what content formats perform best. This intelligence enables you to negotiate better terms with sponsors, create more targeted offers, and build subscription products that actually resonate with your audience. You move from being a commodity media property to being a strategic partner.
                    </p>

                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <img alt="Team Collaboration" className="h-48 w-full object-cover" src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop" />
                    </div>

                    <p className="text-slate-300 leading-relaxed">
                      Consider the compound effect over time. A verified audience of 10,000 engaged readers is worth more—significantly more—than 100,000 passive impressions. Those 10,000 people have demonstrated explicit interest, completed verification, and chosen to continue reading. When you offer them exclusive content, premium opportunities, or sponsor integrations, conversion rates soar. This is the future of sustainable publisher monetization: quality over quantity, engagement over impressions, sustainability over short-term gains.
                    </p>

                    <AdPlacement
                      eyebrow="Final Offer Zone"
                      title="Exclusive Opportunity Placement"
                      description="The last sponsor block before the final handoff to verification."
                      tone="blue"
                      imageUrl="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop"
                    />

                    <CTA 
                      label={phase3InProgress ? `Finalizing… ${phase3Tick}s` : !phase3Completed ? "Unlock Final Section" : "Final Section Ready"}
                      onClick={() => startPhase3()}
                      disabled={phase3InProgress || phase3Completed || phase3Ready}
                    />
                    {phase3Ready && !phase3Completed ? (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            proceedToSponsor();
                            setPhase3Ready(false);
                          }}
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                        >
                            Continue Reading
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-950/30 p-6 text-center">
                    <p className="text-sm font-medium text-yellow-200">Complete Phase 2 first</p>
                    <p className="mt-2 text-xs text-yellow-300">You must finish the second verification to unlock this section.</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
              </section>
          )}
        </div>
      </main>
    </PublicLayout>
  );
}

function CTA({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-3 ${
      disabled ? "bg-slate-900/40" : "bg-gradient-to-r from-slate-900/60 to-slate-800/40 hover:shadow-lg hover:scale-[1.01] transition-all"
    }`}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-400">Click to start verification and continue reading</p>
      </div>
      <button
        onClick={onClick}
        disabled={!!disabled}
        className={`ml-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 transition transform ${
          disabled ? "bg-slate-700/40 cursor-not-allowed" : "bg-cyan-400 hover:scale-105 active:scale-95"
        }`}
      >
        <svg className="h-4 w-4 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
        <span>{disabled ? "Working…" : "Continue Reading"}</span>
      </button>
    </div>
  );
}

function AdPlacement({
  eyebrow,
  title,
  description,
  tone,
  imageUrl,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: "cyan" | "indigo" | "purple" | "emerald" | "rose" | "blue";
  imageUrl: string;
}) {
  const toneMap = {
    cyan: "from-cyan-950/90 to-slate-950/90 border-cyan-400/20 text-cyan-200",
    indigo: "from-indigo-950/90 to-slate-950/90 border-indigo-400/20 text-indigo-200",
    purple: "from-purple-950/90 to-slate-950/90 border-purple-400/20 text-purple-200",
    emerald: "from-emerald-950/90 to-slate-950/90 border-emerald-400/20 text-emerald-200",
    rose: "from-rose-950/90 to-slate-950/90 border-rose-400/20 text-rose-200",
    blue: "from-blue-950/90 to-slate-950/90 border-blue-400/20 text-blue-200",
  } as const;

  const toneClass = toneMap[tone];

  return (
    <div className={`overflow-hidden rounded-3xl border bg-gradient-to-br ${toneClass}`}>
      <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] opacity-80">{eyebrow}</p>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">
              Reserved
            </span>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Inventory</p>
              <p className="mt-1 text-sm font-medium text-white">Premium placement</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Format</p>
              <p className="mt-1 text-sm font-medium text-white">Native sponsor card</p>
            </div>
          </div>
        </div>
        <div className="relative min-h-[220px] border-t border-white/10 md:border-l md:border-t-0">
          <img alt={title} className="h-full w-full object-cover opacity-90" src={imageUrl} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Sponsored message</p>
              <p className="mt-1 text-sm text-white/85">A polished placeholder that feels like part of the article, not an empty box.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
