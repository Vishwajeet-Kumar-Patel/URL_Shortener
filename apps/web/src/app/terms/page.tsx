import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mt-4 text-slate-600">
          By using this service, you agree not to create malicious or abusive links. We reserve the
          right to moderate links for safety and legal compliance.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
