"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const featureCards = [
  {
    title: "Instant URL Shortening",
    description: "Create production-ready short links in seconds with globally unique short codes."
  },
  {
    title: "Global Access",
    description: "Share links that can be opened anywhere, from any region, on any device."
  },
  {
    title: "Click Tracking",
    description: "Track total clicks, trends, and visit behavior from your analytics dashboard."
  },
  {
    title: "Admin Monitored Safety",
    description: "Role-based controls let admins pause or remove harmful links immediately."
  },
  {
    title: "Fast Redirect Engine",
    description: "Low-latency status-aware redirects keep links responsive and reliable."
  },
  {
    title: "Earn with Referrals",
    description: "Get paid when your links generate qualified traffic through our CPM system."
  }
];

const faqItems = [
  {
    q: "Can I manage all my links from one dashboard?",
    a: "Yes. You can view, filter, and track all your links and clicks from the user dashboard."
  },
  {
    q: "Is this role-based platform secure for teams?",
    a: "Yes. JWT auth, refresh rotation, and RBAC protect all user and admin operations."
  },
  {
    q: "Can admins disable malicious links?",
    a: "Yes. Admins can pause, activate, or delete URLs with audit-friendly notifications."
  },
  {
    q: "How do I earn money from short links?",
    a: "Share your referral code with members. When they generate links using your code, you earn CPM for qualified traffic."
  }
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const handleGenerateLink = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url.trim()) {
      alert("Please enter a URL");
      return;
    }

    const signupUrl = referralCode
      ? `/register?ref=${encodeURIComponent(referralCode.trim())}`
      : "/register";

    router.push(signupUrl);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main id="home" className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:pt-10 md:px-8 md:pt-16">
        <section className="grid items-start gap-8 sm:gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
              Trusted by teams and creators
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              Shorten, monetize, and scale your links globally.
            </h1>
            <p className="mt-4 max-w-xl text-slate-600">
              A bold SaaS platform inspired by modern link products with analytics, admin controls,
              and a unique monetization system that pays you for quality traffic.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500" href="/register">
                Start for free
              </Link>
              <Link className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white" href="/login">
                Go to dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <h2 className="text-lg font-semibold text-white">Create a short link</h2>
            <p className="mb-4 mt-1 text-sm text-slate-600">
              Member-only link generation keeps attribution, earnings, and safety tracking tied to a verified account.
            </p>
            <form onSubmit={handleGenerateLink} className="space-y-3">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
                  Your URL
                </label>
                <input
                  id="url"
                  type="url"
                  placeholder="https://example.com/your-long-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  suppressHydrationWarning
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="referral" className="block text-sm font-medium text-slate-700 mb-2">
                  Referral Code (optional)
                </label>
                <input
                  id="referral"
                  type="text"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  suppressHydrationWarning
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                suppressHydrationWarning
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                Generate link
              </button>
              <p className="text-xs text-slate-500 text-center">
                Create an account to start shortening links
              </p>
            </form>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 md:mt-12">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Built for production teams
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-500">
            <span>JWT + refresh rotation</span>
            <span>Role-based admin</span>
            <span>Click analytics</span>
            <span>CPM monetization</span>
          </div>
        </section>

        <section className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white md:mt-16">
          <img
            alt="People collaborating on growth analytics dashboard"
            className="h-56 w-full object-cover md:h-80"
            loading="lazy"
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop"
          />
        </section>

        <section className="mt-14 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-6 text-center md:mt-20">
          <h3 className="text-2xl font-semibold text-white">Earn with every link you share</h3>
          <p className="mx-auto mt-2 max-w-3xl text-slate-600">
            Get a referral code and share it with creators. Earn CPM for every qualified click their links generate.
          </p>
          <Link 
            href="/register"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Join as a partner
          </Link>
        </section>

        <section className="mt-12" id="features">
          <h3 className="text-2xl font-semibold text-white md:text-3xl">Powerful features for modern campaigns</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={feature.title}>
                <h4 className="font-semibold text-white">{feature.title}</h4>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-5 md:grid-cols-3" id="about">
          {[
            "Paste your long URL and click shorten.",
            "Share the short link across channels instantly.",
            "Track engagement and manage safety from dashboard."
          ].map((step, index) => (
            <div className="rounded-2xl border border-slate-200 bg-white p-5" key={step}>
              <p className="text-sm font-semibold text-indigo-600">Step {index + 1}</p>
              <p className="mt-2 text-sm text-slate-700">{step}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h3 className="text-2xl font-semibold text-white md:text-3xl">Frequently asked questions</h3>
          <div className="mt-5 space-y-3">
            {faqItems.map((item) => (
              <details className="rounded-xl border border-slate-200 bg-white p-4" key={item.q}>
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="mt-2 text-sm text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
