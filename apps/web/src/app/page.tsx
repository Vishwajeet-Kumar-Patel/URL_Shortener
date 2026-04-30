"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  formButtonPrimaryClass,
  formInputClass,
  formLabelClass
} from "@/components/ui/form-classes";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type CreatedUrl = {
  shortUrl: string;
  shortCode: string;
};

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
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedUrl | null>(null);
  const [anonSubmitting, setAnonSubmitting] = useState(false);
  const [anonError, setAnonError] = useState<string | null>(null);
  const [anonCreated, setAnonCreated] = useState<CreatedUrl | null>(null);

  const onShorten = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCreated(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const originalUrl = String(formData.get("originalUrl") ?? "").trim();
    if (!originalUrl) return;

    if (!token) {
      router.push("/register");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest<CreatedUrl>("/urls", {
        method: "POST",
        token,
        body: { originalUrl }
      });
      setCreated(data);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to shorten URL");
    } finally {
      setSubmitting(false);
    }
  };

  const onAnonShorten = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnonError(null);
    setAnonCreated(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const originalUrl = String(formData.get("anonOriginalUrl") ?? "").trim();
    const referralCode = String(formData.get("referralCode") ?? "").trim();
    
    if (!originalUrl) return;

    setAnonSubmitting(true);
    try {
      const body: Record<string, unknown> = { originalUrl };
      if (referralCode) {
        body.referralCode = referralCode;
      }
      
      const data = await apiRequest<CreatedUrl>("/urls/public", {
        method: "POST",
        body
      });
      setAnonCreated(data);
      form.reset();
    } catch (err) {
      setAnonError(err instanceof Error ? err.message : "Unable to shorten URL");
    } finally {
      setAnonSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />
      <main id="home" className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:pt-10 md:px-8 md:pt-16">
        <section className="grid items-start gap-8 sm:gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full bg-indigo-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
              Trusted by teams and creators
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              Shorten, monetize, and scale your links globally.
            </h1>
            <p className="mt-4 max-w-xl text-slate-300">
              A bold SaaS platform inspired by modern link products with analytics, admin controls,
              and a unique monetization system that pays you for quality traffic.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500" href="/register">
                Start for free
              </Link>
              <Link className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900" href="/login">
                Go to dashboard
              </Link>
            </div>
          </div>

          {/* Anonymous URL Shortening Form */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl sm:p-6">
            <h2 className="text-lg font-semibold text-white">Create a short link</h2>
            <p className="mb-4 mt-1 text-sm text-slate-300">
              No login needed. Works instantly.
            </p>
            <form className="space-y-4" onSubmit={onAnonShorten}>
              <div>
                <label className={formLabelClass} htmlFor="anon-original-url">
                  Destination URL
                </label>
                <input
                  className={formInputClass}
                  id="anon-original-url"
                  name="anonOriginalUrl"
                  placeholder="https://example.com/your-long-url"
                  required
                  suppressHydrationWarning
                  type="url"
                />
              </div>
              <div>
                <label className={formLabelClass} htmlFor="referral-code">
                  Referral Code (Optional)
                </label>
                <input
                  className={formInputClass}
                  id="referral-code"
                  name="referralCode"
                  placeholder="Enter referral code to support a creator"
                  suppressHydrationWarning
                  type="text"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Have a referral code? Enter it to give them credit for your traffic.
                </p>
              </div>
              <button
                className={formButtonPrimaryClass}
                disabled={anonSubmitting}
                suppressHydrationWarning
                type="submit"
              >
                {anonSubmitting ? "Shortening..." : "Create Short Link"}
              </button>
            </form>
            {anonError ? <p className="mt-3 text-sm text-rose-600">{anonError}</p> : null}
            {anonCreated ? (
              <div className="mt-4 rounded-lg border border-emerald-700 bg-emerald-950/30 p-3">
                <p className="text-sm font-semibold text-emerald-300">Short URL created</p>
                <p className="mt-1 break-all text-sm text-emerald-100">{anonCreated.shortUrl}</p>
                <button 
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                  onClick={() => {
                    navigator.clipboard.writeText(anonCreated.shortUrl);
                  }}
                >
                  Copy link
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800/80 bg-slate-900/40 px-4 py-6 md:mt-12">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Built for production teams
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-400">
            <span>JWT + refresh rotation</span>
            <span>Role-based admin</span>
            <span>Click analytics</span>
            <span>CPM monetization</span>
          </div>
        </section>

        <section className="mt-12 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 md:mt-16">
          <img
            alt="People collaborating on growth analytics dashboard"
            className="h-56 w-full object-cover md:h-80"
            loading="lazy"
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop"
          />
        </section>

        <section className="mt-14 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-6 text-center md:mt-20">
          <h3 className="text-2xl font-semibold text-white">Earn with every link you share</h3>
          <p className="mx-auto mt-2 max-w-3xl text-slate-300">
            Get a referral code and share it with creators. Earn CPM for every qualified click their links generate.
          </p>
          <Link 
            href={token ? "/dashboard/partner/referral-link" : "/register"}
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {token ? "Get your referral code" : "Join as a partner"}
          </Link>
        </section>

        <section className="mt-12" id="features">
          <h3 className="text-2xl font-semibold text-white md:text-3xl">Powerful features for modern campaigns</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm" key={feature.title}>
                <h4 className="font-semibold text-white">{feature.title}</h4>
                <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5" key={step}>
              <p className="text-sm font-semibold text-indigo-600">Step {index + 1}</p>
              <p className="mt-2 text-sm text-slate-200">{step}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h3 className="text-2xl font-semibold text-white md:text-3xl">Frequently asked questions</h3>
          <div className="mt-5 space-y-3">
            {faqItems.map((item) => (
              <details className="rounded-xl border border-slate-800 bg-slate-900 p-4" key={item.q}>
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="mt-2 text-sm text-slate-300">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
