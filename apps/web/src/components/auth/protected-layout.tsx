"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

type Props = {
  children: React.ReactNode;
  role?: "ADMIN" | "MEMBER" | "ADVERTISER";
  roles?: Array<"ADMIN" | "MEMBER" | "ADVERTISER">;
};

export const ProtectedLayout = ({ children, role, roles }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const allowedRoles = roles ?? (role ? [role] : null);
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [isHydrated, pathname, role, roles, router, user]);

  if (!isHydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 py-16">
        <p className="text-sm text-slate-500 sm:text-base">Loading your workspace…</p>
      </div>
    );
  }

  return <>{children}</>;
};
