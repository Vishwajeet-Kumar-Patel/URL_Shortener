"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { PublicLayout } from "@/components/public/public-layout";

type VisitSessionResponse = {
  sessionId: string;
  sessionToken: string;
  shortCode: string;
  nextRoute?: string;
};

type VerifyHumanResponse = {
  sessionId: string;
  currentState: string;
  nextRoute: string;
};

export default function VisitShortCodePage() {
  const params = useParams();
  const router = useRouter();
  const shortCode = String(params.shortCode);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        const result = await apiRequest<VisitSessionResponse>(`/public/visit/${encodeURIComponent(shortCode)}`, {
          method: "POST",
          body: {
            jsEnabled: true,
            cookiesEnabled: typeof navigator !== "undefined" ? navigator.cookieEnabled : true,
            fingerprint: buildFingerprint()
          }
        });

        setSessionId(result.sessionId || result.sessionToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to prepare this visit.");
      } finally {
        setLoading(false);
      }
    };

    void start();
  }, [shortCode]);

  const handleVerifyHuman = async () => {
    if (!sessionId) return;

    setVerifying(true);
    try {
      const result = await apiRequest<VerifyHumanResponse>(`/public/verify-human/${encodeURIComponent(sessionId)}`, {
        method: "POST"
      });

      router.push(result.nextRoute || `/monetize/blog/${encodeURIComponent(sessionId)}?phase=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify this visitor.");
      setVerifying(false);
    }
  };

  return (
    <PublicLayout>
      <main className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_58%)]">
        <div className="mx-auto flex min-h-[calc(100vh-145px)] max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <section className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <p className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Step 1 · Human verification
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Verify You Are Human</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                This is a branded verification step for monetized public links. The destination stays locked while the
                session is bound, the raw open is recorded, and the visitor confirms they want to continue.
              </p>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-inner shadow-slate-950/20">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500" />
                  <div>
                    <p className="text-sm font-semibold text-white">Manual verification required</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      Check the confirmation box and press the button to continue into the editorial monetization funnel.
                    </p>
                  </div>
                </div>

                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <input
                    checked={checkboxChecked}
                    onChange={(event) => setCheckboxChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                    type="checkbox"
                  />
                  <span>I confirm I am not a robot</span>
                </label>

                <button
                  type="button"
                  onClick={handleVerifyHuman}
                  disabled={!checkboxChecked || !sessionId || verifying}
                  className="mt-5 w-full rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {verifying ? "Verifying…" : "Verify Human"}
                </button>

                {loading ? <p className="mt-4 text-sm text-slate-400">Preparing your visit session…</p> : null}
                {sessionId ? <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">Session {sessionId}</p> : null}
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              ) : null}
            </div>

            <aside className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Visitor preview</p>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <img
                  alt="Professional marketing workspace"
                  className="h-56 w-full object-cover"
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <InfoCard label="Theme" value="PurpleMerit" />
                <InfoCard label="Flow" value="Manual unlock" />
                <InfoCard label="Destination" value="Locked" />
              </div>
              <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-4 text-sm leading-6 text-slate-300">
                The public funnel keeps the same SaaS styling as the homepage while turning the redirect into a measured
                verification and ad engagement sequence.
              </div>
            </aside>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}

function buildFingerprint() {
  if (typeof window === "undefined") return "server";
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0)
  ];
  return parts.join("|");
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
