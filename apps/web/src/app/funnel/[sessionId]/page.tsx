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

export default function FunnelRedirectPage() {
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
        
        // Redirect to the appropriate step page
        if (data.currentStep <= 5) {
          router.push(`/funnel/step-${data.currentStep}/${sessionId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load funnel");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-3 text-slate-300">Loading your content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-rose-600">{error}</p>
          <button
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            onClick={() => router.push("/")}
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-3 text-slate-300">Redirecting...</p>
      </div>
    </div>
  );
}
