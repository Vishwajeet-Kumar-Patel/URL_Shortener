"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default function GoSessionPage({ params }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    void params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    router.replace(`/monetize/start?rs=${encodeURIComponent(sessionId)}`);
  }, [router, sessionId]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="w-full space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Secure redirect</p>
          <h1 className="text-2xl font-semibold text-white">One moment…</h1>
          <p className="text-sm text-slate-300">We are moving this visit into the monetized start stage.</p>
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
