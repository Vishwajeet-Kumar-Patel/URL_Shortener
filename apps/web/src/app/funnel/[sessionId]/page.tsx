"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type FunnelProgress = {
  currentStep: number;
  completedSteps: number[];
  progress: number;
  shortCode: string;
};

type StepResponse = {
  isValid: boolean;
  nextStep: number;
  message?: string;
};

export default function FunnelPage() {
  const params = useParams();
  const sessionId = String(params.sessionId);
  const router = useRouter();

  const [progress, setProgress] = useState<FunnelProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [scrollReached, setScrollReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const loadProgress = async () => {
    try {
      const data = await apiRequest<FunnelProgress>(`/redirect/funnel/progress/${sessionId}`);
      setProgress(data);
      initializeStep(data.currentStep);
    } catch (err) {
      setError("Session expired or invalid. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initializeStep = (step: number) => {
    setCanContinue(false);
    if (step === 1 || step === 2 || step === 4) {
      setTimeLeft(10);
      setIsTimerActive(true);
    } else if (step === 3) {
      setCanContinue(false); // Needs CTA click
    } else if (step === 5) {
      setCanContinue(true);
    }
  };

  useEffect(() => {
    void loadProgress();
  }, [sessionId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      if (progress?.currentStep === 1 || progress?.currentStep === 2 || progress?.currentStep === 4) {
        setCanContinue(true);
      }
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft, progress?.currentStep]);

  useEffect(() => {
    const handleScroll = () => {
      if (progress?.currentStep !== 2) return;

      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;

      if (scrolled > 70 && !scrollReached) {
        setScrollReached(true);
        if (timeLeft === 0) {
          setCanContinue(true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [progress?.currentStep, scrollReached, timeLeft]);

  const advanceStep = async () => {
    if (!progress || validating) return;

    setValidating(true);
    try {
      const body: any = {
        currentStep: progress.currentStep,
      };

      if (progress.currentStep === 2) {
        body.scrollPosition = 100;
        body.maxScrollPosition = 100;
        body.hasScrolledEnough = true;
      } else if (progress.currentStep === 3) {
        body.ctaClicked = true;
      }

      const data = await apiRequest<StepResponse>(`/redirect/funnel/validate/${sessionId}`, {
        method: "POST",
        body
      });

      if (data.isValid) {
        if (progress.currentStep === 5) {
          // On final step, call the completion endpoint to mark click qualified and credit payout
          const res = await apiRequest<{ redirectUrl: string }>(`/public/complete/${sessionId}`, {
            method: "POST"
          });
          window.location.href = res.redirectUrl;
        } else {
          await loadProgress();
        }
      } else {
        setError(data.message || "Step validation failed");
      }
    } catch (err) {
      setError("Failed to advance step. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  if (loading && !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
        <h1 className="text-2xl font-bold">Oops!</h1>
        <p className="mt-2 text-slate-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold hover:bg-indigo-500"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100">
      {/* Top Progress Bar */}
      <div className="fixed top-0 z-50 h-2 w-full bg-slate-100">
        <div
          className="h-full bg-indigo-600 transition-all duration-700 ease-out"
          style={{ width: `${progress?.progress}%` }}
        />
      </div>

      {/* Floating Status / Action Button */}
      <div className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2 w-full max-w-xs px-4">
        <div className="flex flex-col items-center gap-4">
          {timeLeft > 0 && isTimerActive && (
            <div className="rounded-full bg-slate-900/95 px-6 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-lg border border-white/10 animate-pulse">
              Please wait {timeLeft} seconds...
            </div>
          )}

          {canContinue && (
            <button
              onClick={advanceStep}
              disabled={validating}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-[0_20px_50px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.02] hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
            >
              {validating ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {progress?.currentStep === 5 ? "Unlock Destination" : "Continue to Next Step"}
                  <svg className="h-6 w-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  </svg>
                </>
              )}
            </button>
          )}

          {progress?.currentStep === 2 && !canContinue && !scrollReached && (
            <div className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-xl animate-bounce">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
              Scroll down to continue
            </div>
          )}
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-6 pt-24 pb-32">
        <header className="mb-12">
          <div className="mb-6 flex items-center gap-3 text-[13px] font-bold text-indigo-600 uppercase tracking-widest">
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 ring-1 ring-indigo-200">Step {progress?.currentStep} of 5</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-slate-500">Industry Insights</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl md:text-6xl leading-[1.1]">
            How Direct-to-User Redirection is Changing Digital Marketing in 2026
          </h1>
          <div className="mt-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200" />
            <div>
              <p className="font-bold text-slate-900 text-lg">Purplemerit Research</p>
              <p className="text-sm font-medium text-slate-500">Updated April 30, 2026 • 15 min read</p>
            </div>
          </div>
        </header>

        <div className="prose prose-slate prose-lg max-w-none">
          <p className="text-xl leading-relaxed text-slate-600 font-medium italic border-l-4 border-indigo-600 pl-6 mb-12">
            "The landscape of digital connectivity is shifting. It's no longer just about the destination,
            but the journey of attribution and value creation that happens in between."
          </p>

          <p>
            As we navigate through the mid-2020s, the concept of a 'link' has evolved significantly.
            What used to be a simple pointer to a document has now become a sophisticated vehicle for
            analytics, monetization, and brand building.
          </p>

          {/* Premium Ad Block 1 */}
          <div className="my-16 rounded-[2.5rem] border border-slate-200 bg-slate-50/50 p-10 text-center ring-1 ring-slate-200/50 shadow-sm">
            <p className="mb-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Exclusive Premium Sponsor</p>
            <div className="mx-auto aspect-[16/9] max-w-md rounded-3xl bg-slate-200 flex items-center justify-center shadow-inner group cursor-pointer overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
              <span className="text-slate-500 font-bold text-xl tracking-tight">Visit Sponsor for Bonus Content</span>
            </div>
            <p className="mt-6 text-sm text-slate-500 font-medium italic">Supporting our sponsors helps keep our services free for everyone.</p>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 mt-16 mb-6">The Power of Targeted Redirection</h2>
          <p>
            Traditional URL shorteners were blind. They didn't understand who was clicking, or why.
            Modern attribution engines like the one you're currently interacting with use hundreds of
            data points to ensure that traffic is not just high-volume, but high-quality.
          </p>

          {/* Step 3 CTA Section */}
          {progress?.currentStep === 3 && (
            <div className="my-16 rounded-[3rem] bg-indigo-900 p-1 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] shadow-2xl">
              <div className="rounded-[2.8rem] bg-indigo-950 p-12 text-center text-white">
                <span className="mb-4 inline-block rounded-full bg-indigo-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-300 ring-1 ring-indigo-500/30">Action Required</span>
                <h3 className="mt-4 text-3xl font-black text-white">Unlock Your Destination</h3>
                <p className="mx-auto mb-10 max-w-md text-indigo-200/80 leading-relaxed">
                  Click the button below to visit our featured sponsor. This will finalize your verification and unlock the destination link.
                </p>
                <a
                  href="https://purplemerit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setCanContinue(true);
                  }}
                  className="inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-5 text-lg font-black text-indigo-950 shadow-[0_20px_50px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:bg-slate-100 active:scale-95"
                >
                  Visit Sponsor Website
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  </svg>
                </a>
                <p className="mt-6 text-xs text-indigo-400 font-bold uppercase tracking-widest">Opens in a new tab</p>
              </div>
            </div>
          )}

          <h2 className="text-3xl font-extrabold text-slate-900 mt-16 mb-6">Monetization as a Service</h2>
          <p>
            For creators, the ability to monetize every share is a game-changer. By building
            engagement funnels directly into the redirection process, we're creating a sustainable
            ecosystem where attention is properly valued and rewarded.
          </p>

          <p>
            This multistep process ensures that users are genuinely engaged with the content,
            which in turn provides better ROI for advertisers and higher payouts for members.
          </p>

          {/* Final Verification Block for Step 4 */}
          {progress?.currentStep === 4 && (
            <div className="mt-16 rounded-[2.5rem] bg-emerald-50 border-2 border-emerald-100 p-12 text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                <svg className="h-7 w-7 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                </svg>
              </div>
              <h3 className="mt-0 text-emerald-950 text-2xl font-black">Final Security Check</h3>
              <p className="text-emerald-700/80 font-medium mb-8">Confirming your session security and human verification...</p>
              <div className="mx-auto h-3 w-64 rounded-full bg-emerald-200/50 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  style={{ width: `${(10 - timeLeft) * 10}%` }}
                />
              </div>
            </div>
          )}

          {/* Final Step Message */}
          {progress?.currentStep === 5 && (
            <div className="mt-16 rounded-[3rem] border-4 border-indigo-600 bg-white p-12 text-center shadow-[0_40px_100px_rgba(79,70,229,0.2)] relative overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-indigo-50" />
              <div className="relative z-10">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-100">
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                  </svg>
                </div>
                <h2 className="mt-0 text-4xl font-black text-slate-900">Link Unlocked!</h2>
                <p className="mx-auto mt-4 max-w-sm text-slate-600 font-medium text-lg leading-relaxed">
                  Verification complete. You have successfully navigated the funnel. Click below to continue to your original destination.
                </p>
              </div>
            </div>
          )}
        </div>
      </article>

      <footer className="border-t border-slate-100 bg-slate-50/50 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Powered by Purplemerit Engine</p>
          <div className="flex justify-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <a className="hover:text-indigo-600 transition-colors" href="#">Report Abuse</a>
            <span className="h-4 w-px bg-slate-200" />
            <a className="hover:text-indigo-600 transition-colors" href="#">Terms</a>
            <span className="h-4 w-px bg-slate-200" />
            <a className="hover:text-indigo-600 transition-colors" href="#">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
