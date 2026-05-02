"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type AdSlotKey = "timer1" | "timer2";

const adSlots: Record<
  AdSlotKey,
  {
    title: string;
    subtitle: string;
    ctaLabel: string;
    destination: string;
    badge: string;
  }
> = {
  timer1: {
    title: "Sponsored Boost: Creator Analytics Pack",
    subtitle:
      "Track engagement quality by region, session depth, and sponsor interaction before you scale your campaigns.",
    ctaLabel: "Preview Offer",
    destination: "https://example.com/ads/creator-analytics",
    badge: "Timer 1 Ad"
  },
  timer2: {
    title: "Premium Partner Spotlight",
    subtitle:
      "Unlock advanced audience cohorts and payout optimization tools. Ideal for publishers with growing traffic.",
    ctaLabel: "Visit Partner",
    destination: "https://example.com/ads/premium-partner",
    badge: "Timer 2 Ad"
  }
};

export default function MonetizedBlogPage() {
  const search = useSearchParams();
  const sessionToken = String(search.get("token") ?? "");

  const [seconds1, setSeconds1] = useState(10);
  const [seconds2, setSeconds2] = useState(10);
  const [timer1Done, setTimer1Done] = useState(false);
  const [scrollReached, setScrollReached] = useState(false);
  const [timer2Done, setTimer2Done] = useState(false);
  const [sponsorOpened, setSponsorOpened] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusCountdown, setFocusCountdown] = useState<number | null>(null);
  const [finalCountdown, setFinalCountdown] = useState<number | null>(null);
  const [activeAd, setActiveAd] = useState<AdSlotKey | null>(null);

  const sponsorAnchorRef = useRef<HTMLDivElement | null>(null);

  const postSessionEvent = async (event: string, payload?: Record<string, unknown>) => {
    if (!sessionToken) return;
    try {
      await apiRequest(`/r/session/${encodeURIComponent(sessionToken)}/event`, {
        method: "POST",
        body: { event, ...(payload || {}) }
      });
    } catch {
      // keep UX uninterrupted on telemetry failures
    }
  };

  useEffect(() => {
    if (!sessionToken) return;

    const t = setInterval(() => {
      setSeconds1((s) => {
        if (s <= 1) {
          clearInterval(t);
          setTimer1Done(true);
          setActiveAd("timer1");
          void postSessionEvent("timer1");
          void postSessionEvent("ad_timer1_popup", { placement: "blog_monetized" });
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [sessionToken]);

  useEffect(() => {
    const onScroll = () => {
      if (!sessionToken || scrollReached) return;
      const anchor = sponsorAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top <= windowHeight * 0.7) {
        setScrollReached(true);
        void postSessionEvent("scroll", {
          scrollPosition: window.scrollY,
          maxScrollPosition: document.documentElement.scrollHeight,
          viewportHeight: windowHeight,
          placement: "blog_monetized"
        });

        setSeconds2(10);
        const t2 = setInterval(() => {
          setSeconds2((prev) => {
            if (prev <= 1) {
              clearInterval(t2);
              setTimer2Done(true);
              setActiveAd("timer2");
              void postSessionEvent("timer2");
              void postSessionEvent("ad_timer2_popup", { placement: "blog_monetized" });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sessionToken, scrollReached]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!sessionToken) return;
      if (document.visibilityState === "visible" && sponsorOpened && !unlocked) {
        void postSessionEvent("focus")
          .then(() => {
            setUnlocked(true);
            setFocusCountdown(10);
          })
          .catch(() => setError("Unable to register return focus"));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [sessionToken, sponsorOpened, unlocked]);

  useEffect(() => {
    if (focusCountdown === null) return;
    if (focusCountdown <= 0) {
      setFocusCountdown(null);
      setFinalCountdown((v) => (v === null ? 10 : v));
      return;
    }
    const id = setInterval(() => setFocusCountdown((v) => (v === null ? null : v - 1)), 1000);
    return () => clearInterval(id);
  }, [focusCountdown]);

  useEffect(() => {
    if (finalCountdown === null) return;
    if (finalCountdown <= 0) {
      setFinalCountdown(null);
      (async () => {
        if (!sessionToken) return;
        setLoadingUnlock(true);
        setError(null);
        try {
          const payload = await apiRequest<{ redirectUrl: string }>(
            `/r/complete/${encodeURIComponent(sessionToken)}`,
            { method: "POST" }
          );
          if (payload?.redirectUrl) {
            window.location.href = payload.redirectUrl;
            return;
          }
          throw new Error("Invalid unlock response");
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoadingUnlock(false);
        }
      })();
      return;
    }
    const id = setInterval(() => setFinalCountdown((v) => (v === null ? null : v - 1)), 1000);
    return () => clearInterval(id);
  }, [finalCountdown]);

  const closeAd = () => setActiveAd(null);

  const openAdDestination = () => {
    if (!activeAd) return;
    window.open(adSlots[activeAd].destination, "_blank", "noopener,noreferrer");
    void postSessionEvent(
      activeAd === "timer1" ? "ad_timer1_click" : "ad_timer2_click",
      { placement: "blog_monetized" }
    );
  };

  const openSponsor = () => {
    const sponsorUrl = "https://www.youtube.com/";
    window.open(sponsorUrl, "_blank", "noopener,noreferrer");
    setSponsorOpened(true);
    void postSessionEvent("sponsor").catch(() => setError("Unable to register sponsor click"));
    setUnlocked(true);
    setFocusCountdown(10);
  };

  const unlockDestination = () => {
    if (!sessionToken) return;
    if (finalCountdown !== null) return;
    setFinalCountdown(10);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <article className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6 md:px-8 md:pt-12">
        <header className="mb-10">
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop&ixlib=rb-4.0.3&s=1a5b1d0b0b7b2f1a9d9d1f2b3c4d5e6f"
                alt="Ocean sunrise representing growth"
                className="h-72 w-full rounded-2xl border border-slate-800 object-cover shadow-2xl"
              />
              <div>
                <p className="inline-block rounded-full bg-indigo-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                  Monetized Read Experience
                </p>
                <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                  The New Economics of Micro-Content
                </h1>
                <p className="mt-3 text-slate-300">By Purple Merit · May 1, 2026 · 8 min read</p>
              </div>
            </div>

            <aside className="sticky top-24 hidden md:col-span-1 md:block">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
                    alt="Author"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-white">Purple Merit</div>
                    <div className="text-sm text-slate-400">Publisher</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  This article explains how session-based sponsor engagement can create sustainable earnings for
                  publishers without forcing intrusive ad patterns.
                </p>
                <div className="mt-4">
                  <a href="/blog" className="text-sm text-indigo-400 hover:text-indigo-300">
                    More articles
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </header>

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Top Banner Ad Slot</p>
          <p className="mt-2 text-sm text-slate-300">This is reserved for hosted ad script placement on this page only.</p>
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 px-4 py-6 text-slate-400" id="hosted-ad-banner">
            [Hosted Ad Container: Replace with network script after deployment]
          </div>
        </div>

        <section className="mb-12 space-y-7 text-slate-200">
          <p className="text-base leading-8 text-slate-300">
            Start reading. A short validation timer ensures real attention before ad milestones trigger earning events.
          </p>
          {timer1Done ? (
            <div className="rounded-xl border-l-4 border-amber-400 bg-amber-950/20 p-4 text-amber-200">
              Timer 1 complete. Scroll to the sponsor zone to continue.
            </div>
          ) : (
            <div className="rounded-xl border-l-4 border-indigo-400 bg-indigo-950/20 p-4 text-indigo-200">
              Timer 1 running: {seconds1}s
            </div>
          )}

          <h2 className="text-3xl font-bold text-white">The Rise of Bite-Sized Monetization</h2>
          <p className="leading-8 text-slate-300">
            Readers no longer move through content in a single, uninterrupted session. They scan, compare, pause,
            and return. That behavior can still support high-quality publishing if monetization is built around
            intent signals instead of forced interruptions.
          </p>

          <figure className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <img
              src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=3f7a9df6f7b6a2d4e6f8b9c2d3a4e5f6"
              alt="Workspace showing campaign planning"
              className="h-80 w-full object-cover"
            />
            <figcaption className="px-4 py-3 text-sm text-slate-400">
              Teams that monetize attention ethically generally optimize session quality before CPM.
            </figcaption>
          </figure>

          <p className="leading-8 text-slate-300">
            In this flow, two timers gate sponsor visibility. Each timer can trigger an on-page ad popup, which can
            later be connected to your hosted ad network. Because events are scoped to this page session, payout logic
            can attribute earnings precisely.
          </p>

          <h3 className="text-2xl font-semibold text-white">How This Page Generates Earnings</h3>
          <ol className="list-decimal space-y-2 pl-6 text-slate-300">
            <li>Spend a short amount of time reading.</li>
            <li>Reach sponsor section and complete timer two.</li>
            <li>Open sponsor tab, come back, and complete unlock countdown.</li>
          </ol>

          <p className="leading-8 text-slate-300">
            This keeps conversion transparent: readers are informed, sponsors receive qualified visibility, and
            publishers can tie completions to measurable earnings.
          </p>

          {[
            {
              heading: "Why Session Depth Matters",
              body: "A click alone has weak value. Session depth, completed steps, and sponsor return signals are better predictors of advertiser outcomes and payout sustainability."
            },
            {
              heading: "Designing Around Reader Trust",
              body: "Users tolerate ad moments when they understand what unlocks next and why. Clear milestones outperform aggressive overlays in long-term retention."
            },
            {
              heading: "Turning Validation Into Revenue",
              body: "Timer events, scroll checkpoints, and sponsor return focus can be converted into revenue events for your admin dashboard and member earning calculations."
            }
          ].map((item) => (
            <div key={item.heading} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h4 className="text-xl font-semibold text-white">{item.heading}</h4>
              <p className="mt-2 leading-8 text-slate-300">{item.body}</p>
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop"
                alt={item.heading}
                className="mt-4 h-56 w-full rounded-xl object-cover"
              />
            </div>
          ))}
        </section>

        <div ref={sponsorAnchorRef} className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-2xl font-semibold text-white">Sponsored Block</h2>
          <p className="mt-2 text-slate-300">Stay on this section until timer two finishes to activate sponsor unlock.</p>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <img
              src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1000&auto=format&fit=crop"
              alt="Sponsored visual"
              className="h-52 w-full rounded-xl object-cover"
            />
            <div>
              <p className="text-slate-300">
                Featured partner offer designed for high-intent publishers. Your completed sponsor interaction helps
                validate traffic quality and powers member earnings.
              </p>
              <p className="mb-4 mt-3 text-sm text-slate-500">Sponsored by Purple Merit Partner Network</p>
              {!timer2Done ? (
                <div className="rounded-xl border-l-4 border-indigo-400 bg-indigo-950/20 p-4 text-indigo-200">
                  Timer 2 running: {seconds2}s
                </div>
              ) : (
                <button
                  onClick={openSponsor}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
                >
                  Visit Sponsor To Unlock Destination
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="space-y-6 text-slate-300">
          <h3 className="text-2xl font-semibold text-white">Implementation Notes</h3>
          <p className="leading-8">
            Timer-based ad popups on this page emit dedicated events (`ad_timer1_popup`, `ad_timer2_popup`) that you
            can later map to ad impressions and earnings once hosted ad providers are connected.
          </p>
          <p className="leading-8">
            For production deployment, replace placeholder destination URLs with real campaign links and inject your ad
            network script inside the dedicated hosted ad containers.
          </p>
        </section>

        <div className="fixed bottom-6 right-6 z-50">
          {unlocked ? (
            finalCountdown !== null ? (
              <div className="rounded-xl bg-amber-900/80 px-4 py-3 text-amber-100 shadow-xl">
                Opening destination in {finalCountdown}s...
              </div>
            ) : (
              <button
                onClick={unlockDestination}
                disabled={loadingUnlock}
                className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-xl hover:bg-emerald-500"
              >
                {loadingUnlock ? "Preparing..." : "Destination Ready - Start Opening"}
              </button>
            )
          ) : (
            <div className="rounded-xl bg-slate-800 px-4 py-3 text-slate-200 shadow-xl">
              Complete sponsor visit to unlock
            </div>
          )}
        </div>

        {error ? <div className="mt-6 text-red-400">{error}</div> : null}
      </article>

      {activeAd ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-indigo-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                {adSlots[activeAd].badge}
              </span>
              <button onClick={closeAd} className="text-sm text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <h3 className="text-2xl font-bold text-white">{adSlots[activeAd].title}</h3>
            <p className="mt-3 leading-7 text-slate-300">{adSlots[activeAd].subtitle}</p>

            <div
              id={`hosted-ad-${activeAd}`}
              className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-5 text-sm text-slate-400"
            >
              Hosted ad placeholder for {activeAd}. Replace this container with ad network embed after hosting.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={openAdDestination}
                className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
              >
                {adSlots[activeAd].ctaLabel}
              </button>
              <button
                onClick={closeAd}
                className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
              >
                Continue Reading
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
