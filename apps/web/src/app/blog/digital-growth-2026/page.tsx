"use client";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import Image from "next/image";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <header className="mb-16 text-center">
          <div className="mb-6 inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 ring-1 ring-indigo-200">
            Featured Article
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl leading-[1.1]">
            The Future of Digital Monetization: <span className="text-indigo-600">Growth Strategies for 2026</span>
          </h1>
          <p className="mt-8 text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            As the digital landscape becomes increasingly fragmented, creators and advertisers are looking for more transparent ways to value attention.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-200" />
            <div className="text-left">
              <p className="font-bold text-slate-900">Dr. Sarah Chen</p>
              <p className="text-sm text-slate-500">Chief Strategy Officer, Purplemerit</p>
            </div>
          </div>
        </header>

        <div className="relative mb-20 aspect-[16/9] w-full overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 ring-slate-200">
          <img 
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=2070" 
            alt="Digital Technology" 
            className="h-full w-full object-cover"
          />
        </div>

        <div className="prose prose-slate prose-xl max-w-none">
          <p className="lead">
            In the last decade, we've seen a massive shift in how value is exchanged on the internet. 
            The rise of the creator economy has forced platforms to rethink their monetization models, 
            moving away from generic display ads toward more integrated, attribution-focused experiences.
          </p>

          <h2>The Era of Attribution</h2>
          <p>
            The biggest challenge in digital marketing today isn't reaching people—it's proving that 
            those people are actually engaged. This is where attribution engines come in. By tracking 
            the journey from a simple link click to a meaningful interaction, platforms can provide 
            better data to advertisers and higher payouts to creators.
          </p>

          <div className="my-16 grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-8 ring-1 ring-slate-200">
              <h3 className="text-xl font-bold text-slate-900">1. Quality over Volume</h3>
              <p className="mt-4 text-slate-600">
                In 2026, the market is pivoting toward 'Qualified Traffic'. It's not about how many eyes see a link, but how many brains process it.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-8 ring-1 ring-slate-200">
              <h3 className="text-xl font-bold text-slate-900">2. Transparent Payouts</h3>
              <p className="mt-4 text-slate-600">
                Creators demand real-time ledger visibility. Blockchain-inspired transparency in earnings is now a standard requirement.
              </p>
            </div>
          </div>

          <p>
            Our research shows that 'engaged redirects'—those that provide value before the destination—have 
            a 40% higher conversion rate than traditional 'blind redirects'. This is because the user 
            is already in an active browsing mindset when they reach the final site.
          </p>

          <div className="my-20 relative aspect-video w-full overflow-hidden rounded-[2.5rem] ring-1 ring-slate-200 shadow-xl">
             <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070" 
              alt="Data Analytics" 
              className="h-full w-full object-cover"
            />
          </div>

          <h2>The Human Element</h2>
          <p>
            Despite all the advancements in AI and automation, the human element remains paramount. 
            Users can sense when they're being treated as 'product' rather than 'audience'. 
            Building trust through clear funnel stages and transparent data usage is the only 
            way to maintain long-term user retention in a crowded marketplace.
          </p>

          <blockquote>
            "The future of the internet is not in the links we share, but in the trust we build 
            between the click and the content."
          </blockquote>

          <p>
            As we look toward the second half of the 2020s, we expect to see even more 
            innovation in the 'interstitial' space—the moments between browsing. 
            Purplemerit is at the forefront of this evolution, building the tools that 
            power the next generation of digital growth.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
