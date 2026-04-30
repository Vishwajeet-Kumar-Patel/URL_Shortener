"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      // Store referral code in cookie for 30 days
      const expires = new Date();
      expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
      document.cookie = `referral_code=${ref};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
      console.log("Referral code captured:", ref);
    }
  }, [searchParams]);

  return null;
}
