"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type ProgressResponse = {
  isValid: boolean;
  nextStep: number;
  message?: string;
  nextRoute?: string;
};

const stageCopy = {
  1: {
    eyebrow: "Blog Layer One",
    title: "Why qualified traffic now matters more than raw clicks",
    summary:
      "This first article introduces the economics of monetized links, session validation, and why a short but meaningful read can support sustainable publisher earnings.",
    timer: 10,
    cta: "Continue to Layer 2",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop"
  },
  2: {
    eyebrow: "Blog Layer Two",
    title: "Designing a funnel that rewards attention without leaking the destination",
    summary:
      "The second layer focuses on scroll depth, contextual ads, and secure progression. Each action is validated against the session rather than trusting the client alone.",
    timer: 15,
    cta: "Continue to Layer 3",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop"
  },
  3: {
    eyebrow: "Blog Layer Three",
    title: "Sponsor interaction as a final engagement signal",
    summary:
      "The last article layer closes the content portion of the funnel and prepares the visitor for sponsor interaction before the final unlock page.",
    timer: 15,
    cta: "Continue to Sponsor Step",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1600&auto=format&fit=crop"
  }
} as const;

export default function MonetizeBlogStagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const step = Number(params.step);
  const sessionToken = String(searchParams.get("rs") ?? "");
  const stage = stageCopy[(step as 1 | 2 | 3) || 1];

  const [secondsLeft, setSecondsLeft] = useState<number>(stage.timer);
  const [allowContinue, setAllowContinue] = useState(false);
  const [scrolledEnough, setScrolledEnough] = useState(step !== 2);
  const [error, setError] = useState<string | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const fingerprint = useMemo(() => {
    if (typeof window === "undefined") return "server";
    return `${navigator.userAgent}:${navigator.language}`;
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setAllowContinue(true);
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (step !== 2) return;

    const onScroll = () => {
      const node = articleRef.current;
      if (!node) return;

      const { scrollTop, scrollHeight, clientHeight } = node;
      const totalScrollable = scrollHeight - clientHeight;
      const percent = totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0;
      if (percent >= 80) {
        setScrolledEnough(true);
      }
    };

    const node = articleRef.current;
    node?.addEventListener("scroll", onScroll);
    return () => node?.removeEventListener("scroll", onScroll);
  }, [step]);

  const validateAdvance = async (body: Record<string, unknown>) => {
    const result = await apiRequest<ProgressResponse>(`/public/funnel/validate/${encodeURIComponent(sessionToken)}`, {
      method: "POST",
      body: {
        sessionToken,
        currentStep: step,
        fingerprint,
        ...body
      }
    });

    if (!result.isValid) {
      throw new Error(result.message ?? "Unable to advance.");
    }

    return result;
  };

  const handleContinue = async () => {
    try {
      await validateAdvance({
        scrollPosition: step === 2 ? 100 : undefined,
        maxScrollPosition: step === 2 ? 100 : undefined,
        ctaClicked: step === 3 ? true : undefined,
        hasScrolledEnough: step === 2 ? scrolledEnough : undefined
      });

      if (step === 3) {
        router.push(`/monetize/unlock?rs=${encodeURIComponent(sessionToken)}`);
        return;
      }

      router.push(`/monetize/blog/${step + 1}?rs=${encodeURIComponent(sessionToken)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    }
  };

  const sponsorClick = async () => {
    try {
      await apiRequest(`/public/session/${encodeURIComponent(sessionToken)}/event`, {
        method: "POST",
        body: { event: "sponsor" }
      });
      window.open("https://www.youtube.com/", "_blank", "noopener,noreferrer");
      setAllowContinue(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register sponsor click.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl shadow-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/70">{stage.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold text-white sm:text-4xl">{stage.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{stage.summary}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article ref={articleRef} className="max-h-[78vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-7">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
              <img src={stage.image} alt={stage.title} className="h-72 w-full object-cover" />
            </div>

            <div className="mt-6 space-y-6 text-slate-300">
              <p>
                The modern short-link stack is no longer a single redirect. It is a measured sequence of interactions that
                verifies a visitor, records attention quality, and only then unlocks the original destination.
              </p>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-100">
                {step === 2 ? `Scroll through this article to unlock the ${stage.timer}-second validation timer.` : `Timer countdown: ${secondsLeft}s remaining.`}
              </div>
              <h2 className="text-2xl font-semibold text-white">Monetization mechanics that stay hidden until completion</h2>
              <p>
                This content explains how a publisher can maintain a clean SaaS feel while still creating qualified views,
                sponsor impressions, and final payout events. The destination remains server-controlled until the flow is complete.
              </p>
              <img
                src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1600&auto=format&fit=crop"
                alt="Analytics and growth planning"
                className="h-64 w-full rounded-[1.5rem] object-cover"
              />
              <p>
                Analytics should distinguish raw opens from funnel progress and qualified completions. That separation is the
                difference between vanity traffic and a monetization engine that can survive scrutiny from advertisers and members.
              </p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ad placeholder</p>
                <div className="mt-3 rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                  Hosted sponsor inventory can render here once connected to your ad network.
                </div>
              </div>
              <p>
                The page intentionally keeps the hidden continue action below the fold. The visitor must either stay long enough,
                read through the article, or complete the sponsor interaction before the funnel advances.
              </p>
            </div>
          </article>

          <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Timer</p>
              <p className="mt-2 text-4xl font-semibold text-white">{secondsLeft}s</p>
              <p className="mt-2 text-sm text-slate-400">Server validation is required before each stage advances.</p>
            </div>

            {step === 2 ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                Scroll to at least 80 percent of the article to unlock the continue button.
              </div>
            ) : null}

            {step === 3 ? (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Sponsor step</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Clicking the sponsor button records the click in the backend and opens the external offer in a new tab.
                </p>
                <button
                  type="button"
                  onClick={sponsorClick}
                  className="mt-4 w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  Visit Sponsor
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!allowContinue && !(step === 2 && scrolledEnough)}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {step === 3 ? "Continue to Unlock" : stage.cta}
            </button>

            {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
