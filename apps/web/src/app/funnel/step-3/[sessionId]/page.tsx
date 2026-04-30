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

export default function FunnelStep3Page() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FunnelProgress | null>(null);
  const [ctaClicked, setCtaClicked] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await apiRequest<FunnelProgress>(`/redirect/funnel/progress/${sessionId}`, {
          method: "GET"
        });
        setProgress(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [sessionId]);

  const handleCtaClick = async () => {
    setCtaClicked(true);
    try {
      const result = await apiRequest<{ isValid: boolean; nextStep: number; message: string }>(
        `/redirect/funnel/validate-step/${sessionId}`,
        {
          method: "POST",
          body: {
            currentStep: 3,
            ctaClicked: true
          }
        }
      );

      if (result.isValid) {
        router.push(`/funnel/step-4/${sessionId}`);
      } else {
        setError("Unable to process. Please try again.");
        setCtaClicked(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance");
      setCtaClicked(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-8 w-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8 rounded-lg bg-slate-900 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress?.progress || 60}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress?.progress || 60}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-3xl font-bold text-white">Step 3: Sponsored Offer</h1>
          <p className="mt-4 text-slate-300">
            Our partner is offering something special for you. Click to see the offer.
          </p>

          {/* Ad container */}
          <div className="mt-8 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950 to-slate-900 p-8 text-center">
            <div className="inline-block rounded-full bg-amber-600/20 px-4 py-2 text-sm font-semibold text-amber-400 mb-4">
              EXCLUSIVE OFFER
            </div>

            <h2 className="mt-4 text-3xl font-bold text-white">Limited Time Deal</h2>
            <p className="mt-4 text-lg text-slate-300">
              Our partner is offering 50% off their premium service
            </p>

            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center text-slate-300">
                <span className="mr-3 text-emerald-500">✓</span>
                <span>Unlock exclusive features</span>
              </div>
              <div className="flex items-center text-slate-300">
                <span className="mr-3 text-emerald-500">✓</span>
                <span>30-day free trial included</span>
              </div>
              <div className="flex items-center text-slate-300">
                <span className="mr-3 text-emerald-500">✓</span>
                <span>Cancel anytime, no questions asked</span>
              </div>
            </div>

            <button
              onClick={handleCtaClick}
              disabled={ctaClicked}
              className="mt-8 rounded-lg bg-amber-600 px-8 py-4 text-lg font-bold text-white hover:bg-amber-500 disabled:opacity-75"
            >
              {ctaClicked ? "Opening offer..." : "Claim Your Offer"}
            </button>

            <p className="mt-4 text-xs text-slate-400">
              By clicking, you acknowledge you're interested in this offer
            </p>
          </div>

          {/* Info */}
          <div className="mt-8 rounded-lg bg-slate-800/50 p-4">
            <p className="text-sm text-slate-400">
              💡 Clicking the offer button helps creators like you earn money. Thank you for your participation!
            </p>
          </div>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
