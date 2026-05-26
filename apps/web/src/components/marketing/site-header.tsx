"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export const SiteHeader = () => {
  const { user, accessToken, isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  const isLoggedIn = Boolean(accessToken && user);
  const appHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link className="text-lg font-bold text-white" href="/">
          PurpleMerit Links
        </Link>
        <div className="flex items-center gap-3 md:hidden">
          {!isHydrated ? (
            <span className="inline-block w-16" aria-hidden />
          ) : isLoggedIn ? (
            <>
              <Link className="text-xs text-slate-600" href="/blog/digital-growth-2026">
                Blog
              </Link>
              <Link
                className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                href={appHref}
              >
                {user?.role === "ADMIN" ? "Admin" : "Dashboard"}
              </Link>
            </>
          ) : (
            <>
              <Link className="text-xs text-slate-600" href="/blog/digital-growth-2026">
                Blog
              </Link>
              <Link className="text-xs text-slate-600" href="/login">
                Login
              </Link>
              <Link className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs text-white" href="/register">
                Sign up
              </Link>
            </>
          )}
        </div>
        <div className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
          <Link href="/">Home</Link>
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link href="/blog/digital-growth-2026">Blog</Link>
          <Link href="/contact">Contact</Link>
          {!isHydrated ? (
            <span className="inline-block w-[11rem]" aria-hidden />
          ) : isLoggedIn ? (
            <Link
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100"
              href={appHref}
            >
              {user?.role === "ADMIN" ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <>
              <Link className="rounded-lg border border-slate-300 px-3 py-2" href="/login">
                Login
              </Link>
              <Link className="rounded-lg bg-blue-600 px-3 py-2 text-white" href="/register">
                Signup
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
