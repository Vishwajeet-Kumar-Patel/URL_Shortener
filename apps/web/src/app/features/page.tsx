import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const features = [
  "Instant short URL generation",
  "Public global redirects",
  "Click analytics and trends",
  "Role-based admin moderation",
  "Google authentication support",
  "Email alerts for moderation events"
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <h1 className="text-4xl font-bold text-white">Features built for serious growth</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Everything you need to shorten, secure, and optimize links at scale.
        </p>
        <img
          alt="Feature analytics dashboard"
          className="mt-6 h-64 w-full rounded-2xl object-cover md:h-80"
          loading="lazy"
          src="https://images.unsplash.com/photo-1551281044-8d8d7b2f9e5a?q=80&w=1600&auto=format&fit=crop"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((item) => (
            <div className="rounded-xl border border-slate-200 bg-white p-4" key={item}>
              {item}
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
