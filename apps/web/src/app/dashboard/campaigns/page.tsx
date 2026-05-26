"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import {
  formButtonPrimaryClass,
  formInputClass,
  formLabelClass,
  formSelectClass
} from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  budgetTotal: number;
  budgetSpent: number;
  landingUrl?: string;
  createdAt: string;
};

type CampaignListResponse = {
  items: Campaign[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function DashboardCampaignsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (user && user.role !== "ADVERTISER") {
      router.replace("/dashboard");
    }
  }, [isHydrated, router, user]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<CampaignListResponse>("/campaigns?page=1&limit=50", { token });
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADVERTISER" && token) void load();
  }, [token, user?.role]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const fd = new FormData(event.currentTarget);
    setMessage(null);
    try {
      await apiRequest("/campaigns", {
        method: "POST",
        token,
        body: {
          name: String(fd.get("name") ?? "").trim(),
          type: String(fd.get("type") ?? "DIRECT"),
          targetDevice: "ALL",
          budgetTotal: Number(fd.get("budgetTotal") ?? 0),
          landingUrl: String(fd.get("landingUrl") ?? "").trim() || undefined
        }
      });
      setMessage("Campaign created.");
      event.currentTarget.reset();
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Create failed");
    }
  };

  const pause = async (id: string) => {
    if (!token) return;
    setMessage(null);
    try {
      await apiRequest(`/campaigns/${id}/pause`, { method: "POST", token });
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  };

  const resume = async (id: string) => {
    if (!token) return;
    setMessage(null);
    try {
      await apiRequest(`/campaigns/${id}/resume`, { method: "POST", token });
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (!isHydrated || !user) {
    return <p className="text-slate-500">Loading...</p>;
  }

  if (user.role !== "ADVERTISER") {
    return null;
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
        <p className="mt-1 text-sm text-slate-500">Create and fund advertising campaigns.</p>
      </div>
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">New campaign</h2>
        <form className="mt-4 grid gap-4 text-sm sm:grid-cols-2" onSubmit={onCreate}>
          <div>
            <label className={formLabelClass} htmlFor="camp-name">
              Name
            </label>
            <input className={formInputClass} id="camp-name" name="name" required />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="camp-type">
              Type
            </label>
            <select className={formSelectClass} id="camp-type" name="type">
              <option value="DIRECT">DIRECT</option>
              <option value="INTERSTITIAL">INTERSTITIAL</option>
              <option value="BANNER">BANNER</option>
              <option value="POPUP">POPUP</option>
            </select>
          </div>
          <div>
            <label className={formLabelClass} htmlFor="camp-budget">
              Budget (INR)
            </label>
            <input className={formInputClass} id="camp-budget" min={0} name="budgetTotal" required type="number" />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass} htmlFor="camp-landing">
              Landing URL (optional)
            </label>
            <input className={formInputClass} id="camp-landing" name="landingUrl" placeholder="https://..." type="url" />
          </div>
          <button className={`${formButtonPrimaryClass} sm:col-span-2`} type="submit">
            Create campaign
          </button>
        </form>
      </div>

      {loading ? <p className="text-slate-500">Loading campaigns...</p> : null}
      {!loading && items.length === 0 ? <p className="text-slate-500">No campaigns yet.</p> : null}
      {!loading && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((c) => (
            <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm" key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{c.name}</p>
                  <p className="mt-1 text-slate-500">
                    {c.type} · {c.status}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Budget INR {c.budgetTotal} · Spent {c.budgetSpent}
                  </p>
                  {c.landingUrl ? (
                    <p className="mt-1 max-w-xl truncate text-xs text-blue-600">{c.landingUrl}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {c.status === "ACTIVE" ? (
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      onClick={() => void pause(c.id)}
                      type="button"
                    >
                      Pause
                    </button>
                  ) : null}
                  {c.status === "PAUSED" ? (
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      onClick={() => void resume(c.id)}
                      type="button"
                    >
                      Resume
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
