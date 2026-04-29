"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api-client";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default function GoSessionPage({ params }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");
  const [seconds, setSeconds] = useState(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    if (seconds <= 0) {
      const run = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/public/complete/${encodeURIComponent(sessionId)}`, {
            method: "POST",
            cache: "no-store"
          });
          const payload = (await response.json()) as {
            success: boolean;
            data?: { redirectUrl: string };
            message?: string;
          };
          if (!response.ok || !payload.success || !payload.data?.redirectUrl) {
            throw new Error(payload.message ?? "Session is invalid or expired");
          }
          window.location.href = payload.data.redirectUrl;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to continue redirect.");
        }
      };
      void run();
      return;
    }

    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, sessionId]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="w-full space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Secure redirect</p>
          <h1 className="text-2xl font-semibold text-white">One moment…</h1>
          <p className="text-sm text-slate-300">We are validating this session and preparing your destination.</p>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-indigo-500/50 bg-indigo-950/40 text-2xl font-semibold text-indigo-200">
            {seconds}
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => router.push("/")}
            type="button"
          >
            Back to homepage
          </button>
        </div>
      </div>
    </main>
  );
}
