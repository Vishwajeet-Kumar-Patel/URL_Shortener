"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedLayout } from "@/components/auth/protected-layout";

const nav = [
  { href: "/advertiser", label: "Overview" },
  { href: "/advertiser/campaigns", label: "Campaigns" },
  { href: "/advertiser/campaigns/create", label: "Create" },
  { href: "/advertiser/analytics", label: "Analytics" },
  { href: "/advertiser/billing", label: "Billing" }
] as const;

export default function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ProtectedLayout roles={["ADVERTISER", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 text-slate-700">
        <header className="border-b border-slate-200 bg-slate-50 px-4 py-4">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-slate-100 text-white" : "text-slate-600 hover:bg-white"}`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
      </div>
    </ProtectedLayout>
  );
}
