import Link from "next/link";

const faqs = [
  {
    q: "How does monetized short linking work?",
    a: "You shorten a URL, share it, and visitors pass through a short interstitial flow before the destination. Qualified traffic contributes to your earnings."
  },
  {
    q: "When is a click counted as qualified?",
    a: "The platform checks validity signals like uniqueness windows, traffic quality, and redirect completion before counting payout-eligible clicks."
  },
  {
    q: "How do withdrawals work?",
    a: "Earnings are credited to wallet ledger, then you can request withdrawal. Admin review marks requests as approved, rejected, or paid."
  },
  {
    q: "Can advertisers run campaigns?",
    a: "Yes. Advertisers can create and fund campaigns, define targeting, and track spend and results from campaign dashboards."
  }
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-700">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 md:py-16">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Help center</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Frequently asked questions</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            Everything you need to understand traffic monetization, publisher earnings, and platform operations.
          </p>
        </header>

        <section className="space-y-4">
          {faqs.map((item) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-5" key={item.q}>
              <h2 className="text-lg font-medium text-white">{item.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </article>
          ))}
        </section>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Need more help? Contact us via the <Link className="text-blue-600 underline" href="/contact">support form</Link>.
        </div>
      </div>
    </main>
  );
}
