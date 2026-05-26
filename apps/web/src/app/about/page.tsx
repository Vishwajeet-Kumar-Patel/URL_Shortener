import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <h1 className="text-4xl font-bold text-white">About PurpleMerit Links</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          We are building a dependable link platform focused on speed, safety, and measurable growth.
        </p>
        <img
          alt="Product team discussing roadmap"
          className="mt-6 h-64 w-full rounded-2xl object-cover md:h-80"
          loading="lazy"
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
