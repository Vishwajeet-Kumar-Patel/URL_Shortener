import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <h1 className="text-3xl font-bold text-white">System Status</h1>
        <div className="mt-6 rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5">
          <p className="font-semibold text-emerald-300">All systems operational</p>
          <p className="mt-1 text-sm text-emerald-100">
            API, redirect engine, and analytics pipeline are healthy.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
