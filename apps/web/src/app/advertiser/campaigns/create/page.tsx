"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formButtonPrimaryClass, formInputClass, formLabelClass, formSelectClass } from "@/components/ui/form-classes";

export default function AdvertiserCampaignCreatePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    const fd = new FormData(e.currentTarget);
    setError(null);
    try {
      await apiRequest("/campaigns/create", {
        method: "POST",
        token,
        body: {
          name: String(fd.get("name") || ""),
          type: String(fd.get("type") || "INTERSTITIAL"),
          targetDevice: String(fd.get("targetDevice") || "ALL"),
          budgetTotal: Number(fd.get("budgetTotal") || 0),
          landingUrl: String(fd.get("landingUrl") || "") || undefined,
          creativeTitle: String(fd.get("creativeTitle") || "") || undefined,
          creativeBody: String(fd.get("creativeBody") || "") || undefined
        }
      });
      router.push("/advertiser/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Create Campaign</h1>
      <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={onSubmit}>
        <div><label className={formLabelClass}>Name</label><input className={formInputClass} name="name" required /></div>
        <div><label className={formLabelClass}>Type</label><select className={formSelectClass} name="type"><option value="INTERSTITIAL">INTERSTITIAL</option><option value="BANNER">BANNER</option><option value="POPUP">POPUP</option><option value="DIRECT">DIRECT</option></select></div>
        <div><label className={formLabelClass}>Target device</label><select className={formSelectClass} name="targetDevice"><option value="ALL">ALL</option><option value="MOBILE">MOBILE</option><option value="DESKTOP">DESKTOP</option></select></div>
        <div><label className={formLabelClass}>Budget total</label><input className={formInputClass} min={0} name="budgetTotal" required type="number" /></div>
        <div><label className={formLabelClass}>Landing URL</label><input className={formInputClass} name="landingUrl" type="url" /></div>
        <div><label className={formLabelClass}>Creative title</label><input className={formInputClass} name="creativeTitle" /></div>
        <div><label className={formLabelClass}>Creative body</label><textarea className={`${formInputClass} min-h-28`} name="creativeBody" /></div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className={formButtonPrimaryClass} type="submit">Create campaign</button>
      </form>
    </section>
  );
}
