"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type PageProps = {
  params: Promise<{ shortCode: string }>;
};

export default function PublicRedirectPage({ params }: PageProps) {
  const router = useRouter();

  useEffect(() => {
    void params.then(({ shortCode }) => {
      router.replace(`/visit/${encodeURIComponent(shortCode)}`);
    });
  }, [params, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-white">Preparing your link…</h1>
        <p className="mt-2 text-slate-300">Please wait while we route you into the monetization visit flow.</p>
      </div>
    </main>
  );
}
