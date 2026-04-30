"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

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
  const [finalUrl, setFinalUrl] = useState<string | null>(null);

  const sponsorAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sessionToken) return;

    // Start first 10s timer
    const t = setInterval(() => {
      setSeconds1((s) => {
        if (s <= 1) {
          clearInterval(t);
          setTimer1Done(true);
          // notify backend
          void apiRequest(`/r/session/${encodeURIComponent(sessionToken)}/event`, {
            method: "POST",
            body: { event: "timer1" }
          }).catch(() => {});
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
      // if anchor top is within bottom 30% of viewport
      if (rect.top <= windowHeight * 0.7) {
        setScrollReached(true);
        // notify backend
        void apiRequest(`/r/session/${encodeURIComponent(sessionToken)}/event`, {
          method: "POST",
          body: { event: "scroll", scrollPosition: window.scrollY, maxScrollPosition: document.documentElement.scrollHeight, viewportHeight: windowHeight }
        }).catch(() => {});
        // start second timer
        setSeconds2(10);
        const t2 = setInterval(() => {
          setSeconds2((prev) => {
            if (prev <= 1) {
              clearInterval(t2);
              setTimer2Done(true);
              void apiRequest(`/r/session/${encodeURIComponent(sessionToken)}/event`, {
                method: "POST",
                body: { event: "timer2" }
              }).catch(() => {});
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
        // user returned after sponsor visit: notify backend then start 10s auto-unlock countdown
        void apiRequest(`/r/session/${encodeURIComponent(sessionToken)}/event`, {
          method: "POST",
          body: { event: "focus" }
        })
          .then(() => {
              // show unlock state and start a 10s countdown before auto-unlock
              setUnlocked(true);
              setFocusCountdown(10);
            })
          .catch(() => setError("Unable to register return focus"));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [sessionToken, sponsorOpened]);

  // auto-unlock countdown effect
  useEffect(() => {
    if (focusCountdown === null) return;
    if (focusCountdown <= 0) {
      // when focus auto-countdown finishes, start the final countdown flow
      setFocusCountdown(null);
      setFinalCountdown((v) => (v === null ? 10 : v));
      return;
    }
    const id = setInterval(() => setFocusCountdown((v) => (v === null ? null : v - 1)), 1000);
    return () => clearInterval(id);
  }, [focusCountdown]);

  // final countdown effect: when it reaches 0, request final redirect URL
  useEffect(() => {
    if (finalCountdown === null) return;
    if (finalCountdown <= 0) {
      setFinalCountdown(null);
      void (async () => {
        if (!sessionToken) return;
        setLoadingUnlock(true);
        setError(null);
        try {
          const payload = await apiRequest<{ redirectUrl: string }>(`/r/complete/${encodeURIComponent(sessionToken)}`, { method: "POST" });
          if (payload?.redirectUrl) {
            setFinalUrl(payload.redirectUrl);
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

  const openSponsor = () => {
    // open sponsor in new tab and notify backend
    const sponsorUrl = "https://www.youtube.com/";
    window.open(sponsorUrl, "_blank");
    setSponsorOpened(true);
    void apiRequest(`/r/session/${encodeURIComponent(sessionToken)}/event`, {
      method: "POST",
      body: { event: "sponsor" }
    }).catch(() => setError("Unable to register sponsor click"));
    // start countdown immediately so the original tab will auto-unlock after 10s
    setUnlocked(true);
    setFocusCountdown(10);
  };

  // Starts the final 10s countdown; after it completes the final URL will be fetched
  const unlockDestination = () => {
    if (!sessionToken) return;
    if (finalCountdown !== null || finalUrl) return; // already in progress
    setFinalCountdown(10);
  };

  const openFinalDestination = () => {
    if (!finalUrl) return;
    // direct navigation to final URL
    window.location.href = finalUrl;
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <article className="mx-auto max-w-3xl p-6">
        <header className="mb-8">
          <div className="space-y-4">
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop&ixlib=rb-4.0.3&s=1a5b1d0b0b7b2f1a9d9d1f2b3c4d5e6f"
              alt="Hero"
              className="w-full h-64 rounded object-cover shadow-sm"
            />
            <div>
              <h1 className="text-4xl font-bold">The New Economics of Micro-Content</h1>
              <p className="mt-2 text-slate-600">By Purple Merit — April 30, 2026 · 8 min read</p>
            </div>
          </div>
        </header>

        {/* Ad / Hero banner */}
        <div className="mb-8 rounded border p-6 text-center bg-slate-50">[Ad Banner Placeholder]</div>

        {/* Article content (rich content with images) */}
        <section className="prose mb-12">
          <p>Start reading the article. The first 10-second timer is running.</p>
          {timer1Done ? (
            <div className="my-4 rounded border-l-4 border-amber-400 bg-amber-50 p-4">Please scroll down to continue.</div>
          ) : (
            <div className="my-4 rounded border-l-4 border-indigo-400 bg-indigo-50 p-4">Waiting: {seconds1}s</div>
          )}

          <h2>The Rise of Bite-Sized Monetization</h2>
          <p>
            Small moments of attention across the web—an article paragraph, a short clip, or a single image—now
            represent meaningful monetization opportunities. Publishers and creators can design experiences that
            respect readers while enabling sponsor value.
          </p>

          <figure>
            <img
              src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=3f7a9df6f7b6a2d4e6f8b9c2d3a4e5f6"
              alt="Desk workspace"
              className="w-full rounded"
            />
            <figcaption className="text-sm text-slate-500">Photo by Unsplash</figcaption>
          </figure>

          <p>
            Engagement-first monetization works when readers get choice and the page flow is natural. In this
            experiment you are shown sponsor content inline and encouraged to visit—your return signals intent and
            unlocks the destination.
          </p>

          <h3>How it works</h3>
          <ol>
            <li>Spend a short amount of time reading.</li>
            <li>Scroll to the sponsor area and wait for the second timer.</li>
            <li>Visit the sponsor in a new tab and come back — the page will unlock automatically.</li>
          </ol>

          <p>
            Below are several sections with images and examples of content that mimic a long-form public blog article.
            Continue scrolling to reach the sponsored block.
          </p>

          {Array.from({ length: 6 }).map((_, i) => (
            <p key={i}>
              Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent
              libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis
              ipsum. Praesent mauris.
            </p>
          ))}
        </section>

        {/* Middle section with anchor for scroll detection */}
        <div ref={sponsorAnchorRef} className="mb-8 rounded border p-6 bg-slate-50">
          <h2 className="text-2xl font-semibold">Sponsored Content</h2>
          <p className="mt-2">Scroll here to reveal sponsor content.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=2b3a6f8e9d7c4a1b0c8d9e3f4a5b6c7d"
              alt="Sponsor"
              className="w-full rounded object-cover h-48"
            />
            <div>
              <p className="mb-2">A brief sponsor description that explains why this offer is useful to readers.</p>
              <div className="text-sm text-slate-500 mb-4">Sponsored by Example Co.</div>
            </div>
          </div>
          {!timer2Done ? (
            <div className="mt-4 rounded border-l-4 border-indigo-400 bg-indigo-50 p-4">Second timer: {seconds2}s</div>
          ) : (
            <div className="mt-4">
              <button onClick={openSponsor} className="rounded bg-indigo-600 px-4 py-2 text-white">Visit Sponsor To Unlock Destination</button>
            </div>
          )}
        </div>

        {/* More article */}
        <section className="prose">
          {Array.from({ length: 8 }).map((_, i) => (
            <p key={i}>More article content paragraph #{i + 1} for readers to engage with.</p>
          ))}
        </section>

        {/* Final unlock area */}
        <div className="fixed bottom-6 right-6 z-50">
          {unlocked ? (
            <div>
              {finalUrl ? (
                <button onClick={openFinalDestination} className="rounded bg-emerald-600 px-4 py-3 text-white">Open Destination</button>
              ) : finalCountdown !== null ? (
                <div className="rounded bg-amber-50 px-4 py-3 text-amber-800">Preparing destination… {finalCountdown}s</div>
              ) : (
                <button onClick={unlockDestination} disabled={loadingUnlock} className="rounded bg-emerald-600 px-4 py-3 text-white">
                  {loadingUnlock ? "Preparing…" : "Destination Ready — Start Opening"}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded bg-slate-100 px-4 py-3 text-slate-700">Complete sponsor visit to unlock</div>
          )}
        </div>

        {error ? <div className="mt-6 text-red-600">{error}</div> : null}
      </article>
    </main>
  );
}
