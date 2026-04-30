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

export default function FunnelStep1Page() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FunnelProgress | null>(null);

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

  const handleContinue = async () => {
    try {
      const result = await apiRequest<{ isValid: boolean; nextStep: number; message: string }>(
        `/redirect/funnel/validate-step/${sessionId}`,
        {
          method: "POST",
          body: {
            currentStep: 1,
            scrollPosition: 0,
            ctaClicked: false
          }
        }
      );

      if (result.isValid) {
        router.push(`/funnel/step-2/${sessionId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance");
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
            <span>{progress?.progress || 20}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress?.progress || 20}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-3xl font-bold text-white">Step 1: Discover</h1>
          <p className="mt-4 text-slate-300">
            This is where the magic begins. We're showing you valuable content before you continue.
          </p>

          {/* Article mockup */}
          <div className="mt-8 space-y-6">
            <div className="rounded-lg bg-slate-800 p-6">
              <h2 className="mb-3 text-xl font-semibold text-white">Featured Article</h2>
              <p className="text-slate-300">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <p className="mt-4 text-slate-400">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>

            <div className="rounded-lg bg-slate-800/50 p-4 text-sm text-slate-400">
              <p>📢 Advertisement placeholder</p>
            </div>

            <div className="rounded-lg bg-slate-800 p-6">
              <h3 className="font-semibold text-white">Why this matters</h3>
              <p className="mt-2 text-slate-300">
                We believe in providing value before asking for your attention. Take a moment to read and understand the content.
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={loading}
            className="mt-8 w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Continue to Next Step
          </button>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
