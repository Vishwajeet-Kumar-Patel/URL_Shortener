"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { useAuthStore } from "@/store/auth.store";

type NavItem = {
  href: string;
  label: string;
  note?: string;
  match?: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", note: "Overview" },
  { href: "/dashboard#new-link", label: "New Shorten Link", note: "Create link", match: () => false },
  { href: "/dashboard/analytics", label: "Statistics", note: "Traffic trends" },
  { href: "/dashboard/urls", label: "Manage Links", note: "All links" },
  { href: "/dashboard/wallet", label: "Withdraw", note: "Payouts" },
  { href: "/dashboard/tools", label: "Tools", note: "Utilities" },
  { href: "/dashboard/referrals", label: "Referrals", note: "Referral earnings" },
  { href: "/dashboard/billing", label: "Invoices", note: "Billing history" },
  { href: "/dashboard/profile", label: "Settings", note: "Account settings" },
  { href: "/dashboard/support", label: "Support", note: "Contact us" }
];

const advertiserNavItem: NavItem = {
  href: "/dashboard/campaigns",
  label: "Campaigns",
  note: "Advertiser tools"
};

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-6">
      <span
        className={`absolute left-0 block h-0.5 w-full rounded bg-slate-700 transition-all ${
          open ? "top-2 rotate-45" : "top-1"
        }`}
      />
      <span
        className={`absolute left-0 top-2 block h-0.5 w-full rounded bg-slate-700 transition-opacity ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 block h-0.5 w-full rounded bg-slate-700 transition-all ${
          open ? "top-2 -rotate-45" : "top-3"
        }`}
      />
    </span>
  );
}

export function MemberAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const role = useAuthStore((state) => state.user?.role);
  const [navOpen, setNavOpen] = useState(false);

  const items = useMemo(() => {
    if (role === "ADVERTISER") {
      return [...navItems.slice(0, 8), advertiserNavItem, ...navItems.slice(8)];
    }
    return navItems;
  }, [role]);

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
      {items.map(({ href, label, note, match }) => {
        const active = match ? match(pathname) : href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={label}
            className={`group rounded-2xl px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-blue-50 text-blue-700 shadow-sm"
                : "text-slate-600 hover:bg-yellow-100/70 hover:text-slate-900"
            }`}
            href={href}
            onClick={() => setNavOpen(false)}
          >
            <span className="block font-medium">{label}</span>
            {note ? <span className="block text-[11px] text-slate-500 group-hover:text-slate-600">{note}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <ProtectedLayout roles={["MEMBER", "ADVERTISER"]}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-700 md:flex-row">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
          <Link className="text-lg font-bold tracking-tight text-slate-900" href="/dashboard">
            PurpleMerit Links
          </Link>
          <button
            aria-expanded={navOpen}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => setNavOpen((current) => !current)}
            type="button"
          >
            <MenuIcon open={navOpen} />
          </button>
        </header>

        {navOpen ? (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-slate-50 md:hidden"
            onClick={closeNav}
            type="button"
          />
        ) : null}

        <aside
          className={`fixed bottom-0 left-0 top-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white pt-16 transition-transform duration-200 ease-out md:static md:z-0 md:h-screen md:translate-x-0 md:pt-0 md:shrink-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="border-b border-slate-200 px-5 py-5">
            <Link className="block text-2xl font-black tracking-tight text-slate-900" href="/dashboard">
              PurpleMerit Links
            </Link>
            <p className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-500">Member</p>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-yellow-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-600">Workspace</p>
              <p className="mt-2 text-sm text-slate-600">Shorten, track, earn, and withdraw from one dashboard.</p>
            </div>
            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Menu</p>
              <NavLinks mobile />
            </div>
            <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-yellow-50"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="min-h-0 flex-1 pt-16 md:pt-0">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-8">{children}</div>
        </main>
      </div>
    </ProtectedLayout>
  );
}