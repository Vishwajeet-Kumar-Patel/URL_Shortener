"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api-client";

type PageProps = {
  params: Promise<{ shortCode: string }>;
};

export default function PublicRedirectPage({ params }: PageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { shortCode } = await params;
      try {
        const response = await fetch(`${API_BASE_URL}/public/visit/${encodeURIComponent(shortCode)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsEnabled: true,
            cookiesEnabled: navigator.cookieEnabled
          })
        });
        const payload = (await response.json()) as {
          success: boolean;
          data?: { sessionId: string };
          message?: string;
        };
        if (!response.ok || !payload.success || !payload.data?.sessionId) {
          throw new Error(payload.message ?? "Unable to prepare redirect.");
        }
        router.replace(`/go/${encodeURIComponent(payload.data.sessionId)}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to process this short link.");
      }
    };
    void run();
  }, [params, router]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-white">Unable To Resolve Link</h1>
          <p className="mt-2 text-slate-300">{error}</p>
          <div className="mt-5">
            <Link className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500" href="/">
              Go to homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-white">Preparing your link…</h1>
        <p className="mt-2 text-slate-300">Please wait while we validate this visit.</p>
      </div>
    </main>
  );
}
