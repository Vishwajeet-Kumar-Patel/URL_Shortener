"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type FunnelProgress = {
  currentStep: number;
  completedSteps: number[];
  progress: number;
  shortCode: string;
};

export default function FunnelStep2Page() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);
  const contentRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FunnelProgress | null>(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [isScrollLocked, setIsScrollLocked] = useState(true);

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

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const totalScrollable = scrollHeight - clientHeight;
        const percentage = totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0;
        setScrollPercentage(percentage);

        // Unlock after 80% scroll
        if (percentage >= 80) {
          setIsScrollLocked(false);
        }
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener("scroll", handleScroll);
      return () => element.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const handleContinue = async () => {
    try {
      const result = await apiRequest<{ isValid: boolean; nextStep: number; message: string }>(
        `/redirect/funnel/validate-step/${sessionId}`,
        {
          method: "POST",
          body: {
            currentStep: 2,
            scrollPosition: scrollPercentage,
            hasScrolledEnough: scrollPercentage >= 80
          }
        }
      );

      if (result.isValid) {
        router.push(`/funnel/step-3/${sessionId}`);
      } else {
        setError("Please scroll down to unlock. You must read 80% of the content.");
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
        <div className="mb-8 rounded-lg bg-slate-900 p-4 sticky top-0 z-10">
          <div className="mb-2 flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress?.progress || 40}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress?.progress || 40}%` }}
            ></div>
          </div>

          <div className="mt-3 rounded bg-slate-800 p-2">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Scroll Progress</span>
              <span>{Math.round(scrollPercentage)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full transition-all ${
                  scrollPercentage >= 80 ? "bg-emerald-600" : "bg-blue-600"
                }`}
                style={{ width: `${scrollPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-8 max-h-96 overflow-y-auto"
        >
          <h1 className="text-3xl font-bold text-white">Step 2: Read the Content</h1>
          <p className="mt-4 text-slate-300 mb-6">
            We ask that you read at least 80% of this content before continuing. This ensures you find value in what we're sharing.
          </p>

          {/* Long-form content */}
          <div className="space-y-6 text-slate-300">
            <div>
              <h2 className="mb-3 text-xl font-semibold text-white">Section 1: Introduction</h2>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure 
                dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-semibold text-white">Section 2: Key Points</h2>
              <ul className="list-inside list-disc space-y-2">
                <li>Excepteur sint occaecat cupidatat non proident</li>
                <li>Sunt in culpa qui officia deserunt mollit anim</li>
                <li>Id est laborum sed ut perspiciatis unde omnis</li>
                <li>Natus error sit voluptatem accusantium doloremque</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-semibold text-white">Section 3: Deep Dive</h2>
              <p>
                Laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. 
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione 
                voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia 
                non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-semibold text-white">Section 4: Conclusion</h2>
              <p>
                Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. 
                Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum 
                fugiat quo voluptas nulla pariatur.
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Advertisement or promotional content would appear here in a real scenario.
              </p>
            </div>
          </div>
        </div>

        {/* CTA - locked until scroll */}
        <div className="mt-8 space-y-4">
          {isScrollLocked && (
            <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4">
              <p className="text-sm text-amber-300">
                📖 Please scroll down to read more content before continuing ({Math.round(scrollPercentage)}%)
              </p>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={isScrollLocked}
            className={`w-full rounded-lg px-6 py-3 font-semibold text-white transition-all ${
              isScrollLocked
                ? "bg-slate-700 cursor-not-allowed opacity-50"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {isScrollLocked ? `Continue Reading (${Math.round(scrollPercentage)}%)` : "Unlock & Continue"}
          </button>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
