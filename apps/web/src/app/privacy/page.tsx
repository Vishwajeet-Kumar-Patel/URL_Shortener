import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-4 text-slate-600">
          We collect only the data required for account security, link analytics, and service quality.
          This includes click metadata such as timestamp, referrer, and user agent.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
