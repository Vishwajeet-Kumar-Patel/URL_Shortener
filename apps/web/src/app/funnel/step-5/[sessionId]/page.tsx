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

type SessionStatus = {
  isComplete: boolean;
  isQualified: boolean;
  currentStep: number;
  targetUrl: string;
};

export default function FunnelStep5Page() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FunnelProgress | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await apiRequest<FunnelProgress>(`/redirect/funnel/progress/${sessionId}`, {
          method: "GET"
        });
        setProgress(data);

        // Also fetch session status to get the target URL
        const status = await apiRequest<SessionStatus>(`/redirect/funnel/progress/${sessionId}`, {
          method: "GET"
        });
        setSessionStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [sessionId]);

  const handleUnlock = async () => {
    setRedirecting(true);
    try {
      // Record the completion
      await apiRequest<{ isValid: boolean; nextStep: number; message: string }>(
        `/redirect/funnel/validate-step/${sessionId}`,
        {
          method: "POST",
          body: {
            currentStep: 5,
            completed: true
          }
        }
      );

      // Simulate processing time for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Redirect to the target URL
      if (sessionStatus?.targetUrl) {
        window.location.href = sessionStatus.targetUrl;
      } else {
        // Fallback redirect
        router.push("/");
      }
    } catch (err) {
      setRedirecting(false);
      setError(err instanceof Error ? err.message : "Failed to complete funnel");
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
            <span>100%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div className="h-full w-full rounded-full bg-emerald-600"></div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-600">
              <span className="text-3xl">🎉</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">You've Completed All Steps!</h1>
          
          <p className="text-lg text-slate-300 mb-2">
            Thank you for engaging with our content and supporting our creators.
          </p>
          
          <p className="text-sm text-slate-400 mb-8">
            You've earned this access. Your participation helps creators earn sustainable income.
          </p>

          {/* Summary */}
          <div className="rounded-lg bg-slate-800/50 p-6 mb-8 text-left">
            <h2 className="font-semibold text-white mb-4">What you did:</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center">
                <span className="mr-3 text-emerald-500">✓</span>
                <span>Read quality content</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-emerald-500">✓</span>
                <span>Engaged with a sponsored offer</span>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-emerald-500">✓</span>
                <span>Verified your attention</span>
              </div>
            </div>
          </div>

          {/* Earnings info */}
          <div className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-6 mb-8">
            <p className="text-sm text-emerald-300 mb-2">💰 Creator Earnings</p>
            <p className="text-emerald-100">
              The creator who shared this link is earning money for this qualified visit. This is how we support quality content creators.
            </p>
          </div>

          {/* Final CTA */}
          <button
            onClick={handleUnlock}
            disabled={redirecting}
            className={`w-full rounded-lg px-6 py-4 text-lg font-bold text-white transition-all ${
              redirecting
                ? "bg-slate-700 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {redirecting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Unlocking content...
              </span>
            ) : (
              "Unlock & Access Content"
            )}
          </button>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          <p className="mt-6 text-xs text-slate-500">
            Redirecting to your destination. If nothing happens, check your browser's popup settings.
          </p>
        </div>
      </div>
    </div>
  );
}
