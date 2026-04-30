"use client";

import { MemberAppShell } from "@/components/dashboard/member-app-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberAppShell>{children}</MemberAppShell>
  );
}
