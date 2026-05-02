"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/earnings", label: "Earnings" },
  { href: "/admin/click-logs", label: "Click Logs" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/publishers", label: "Publishers" },
  { href: "/admin/advertisers", label: "Advertisers" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/cpm-rates", label: "CPM Rates" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/profile", label: "Profile" },
  { href: "/admin/settings", label: "Settings" }
] as const;

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-6">
      <span
        className={`absolute left-0 block h-0.5 w-full rounded bg-slate-200 transition-all ${
          open ? "top-2 rotate-45" : "top-1"
        }`}
      />
      <span
        className={`absolute left-0 top-2 block h-0.5 w-full rounded bg-slate-200 transition-opacity ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 block h-0.5 w-full rounded bg-slate-200 transition-all ${
          open ? "top-2 -rotate-45" : "top-3"
        }`}
      />
    </span>
  );
}

export function AdminAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    closeNav();
  }, [pathname, closeNav]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const NavLinks = ({ mobile }: { mobile?: boolean }) => (
    <nav className={`flex flex-col gap-1 ${mobile ? "px-2" : ""}`}>
      {nav.map(({ href, label }) => {
        const active =
          href === "/admin"
            ? pathname === "/admin"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"
            }`}
            href={href}
            onClick={() => setNavOpen(false)}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 md:flex-row">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:hidden">
        <Link className="text-base font-bold tracking-tight text-white" href="/">
          PurpleMerit Links
        </Link>
        <button
          aria-expanded={navOpen}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-900"
          onClick={() => setNavOpen((o) => !o)}
          type="button"
        >
          <MenuIcon open={navOpen} />
        </button>
      </header>

      {navOpen ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeNav}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-950 pt-14 transition-transform duration-200 ease-out md:static md:z-0 md:h-screen md:translate-x-0 md:pt-0 md:shrink-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden border-b border-slate-800 px-4 py-4 md:block">
          <Link className="text-lg font-bold tracking-tight text-white" href="/">
            PurpleMerit Links
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">Admin</p>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4">
          <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">
            Menu
          </div>
          <NavLinks mobile />
          <div className="flex-1" />
          <button
            className="rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-0 flex-1 pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
