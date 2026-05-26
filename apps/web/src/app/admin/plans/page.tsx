"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { formButtonPrimaryClass, formInputClass, formLabelClass, formSelectClass } from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type Plan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: "FREE" | "MONTHLY" | "YEARLY";
  isActive: boolean;
  isDefault: boolean;
  limits: {
    maxLinks: number;
    analyticsAccess: boolean;
    customAlias: boolean;
    campaignAccess: boolean;
    payoutLimit: number;
  };
};

type PlanListResponse = { items: Plan[] };

export default function AdminPlansPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<PlanListResponse>("/plans/admin", { token });
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (plan: Plan) => {
    if (!token) return;
    setMessage(null);
    try {
      await apiRequest(`/plans/${plan.id}`, {
        method: "PATCH",
        token,
        body: { isActive: !plan.isActive }
      });
      setMessage("Plan updated.");
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    }
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    setMessage(null);
    try {
      await apiRequest<Plan>("/plans", {
        method: "POST",
        token,
        body: {
          name: String(fd.get("name") ?? "").trim(),
          description: String(fd.get("description") ?? "").trim() || undefined,
          price: Number(fd.get("price") ?? 0),
          currency: String(fd.get("currency") ?? "INR").toUpperCase(),
          interval: String(fd.get("interval") ?? "MONTHLY"),
          isDefault: fd.get("isDefault") === "on",
          limits: {
            maxLinks: Number(fd.get("maxLinks") ?? 0),
            analyticsAccess: fd.get("analyticsAccess") === "on",
            customAlias: fd.get("customAlias") === "on",
            campaignAccess: fd.get("campaignAccess") === "on",
            payoutLimit: Number(fd.get("payoutLimit") ?? 0)
          }
        }
      });
      form.reset();
      setMessage("Plan created.");
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Create failed");
    }
  };

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Plans</h1>
        <p className="mt-1 text-sm text-slate-500">Manage subscription tiers and entitlements.</p>
      </div>
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Create plan</h2>
        <form className="mt-4 grid gap-4 text-sm sm:grid-cols-2" onSubmit={onCreate}>
          <div>
            <label className={formLabelClass} htmlFor="plan-name">
              Name
            </label>
            <input className={formInputClass} id="plan-name" name="name" required />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="plan-currency">
              Currency
            </label>
            <input className={formInputClass} defaultValue="INR" id="plan-currency" name="currency" />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="plan-price">
              Price
            </label>
            <input className={formInputClass} id="plan-price" min={0} name="price" required step={0.01} type="number" />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="plan-interval">
              Interval
            </label>
            <select className={formSelectClass} id="plan-interval" name="interval">
              <option value="FREE">FREE</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="YEARLY">YEARLY</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass} htmlFor="plan-description">
              Description
            </label>
            <input className={formInputClass} id="plan-description" name="description" />
          </div>
          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-2 text-sm text-slate-600 sm:col-span-2">
            <input className="h-4 w-4 rounded border-slate-300" name="isDefault" type="checkbox" />
            Default plan for new users
          </label>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <div>
              <label className={formLabelClass} htmlFor="plan-max-links">
                Max links
              </label>
              <input className={formInputClass} defaultValue={50} id="plan-max-links" min={0} name="maxLinks" type="number" />
            </div>
            <div>
              <label className={formLabelClass} htmlFor="plan-payout-limit">
                Payout limit
              </label>
              <input className={formInputClass} defaultValue={0} id="plan-payout-limit" min={0} name="payoutLimit" type="number" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="analyticsAccess" type="checkbox" />
              Analytics access
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input className="h-4 w-4 rounded border-slate-300" name="customAlias" type="checkbox" />
              Custom alias
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 sm:col-span-2">
              <input className="h-4 w-4 rounded border-slate-300" name="campaignAccess" type="checkbox" />
              Campaign access
            </label>
          </div>
          <button className={`${formButtonPrimaryClass} sm:col-span-2`} type="submit">
            Create plan
          </button>
        </form>
      </div>

      {loading ? <p className="text-slate-500">Loading...</p> : null}
      {!loading && items.length === 0 ? <p className="text-slate-500">No plans yet.</p> : null}
      {!loading && items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Interval</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Default</th>
                <th className="px-3 py-2">Max links</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr className="border-t border-slate-200" key={p.id}>
                  <td className="px-3 py-2 font-medium text-white">{p.name}</td>
                  <td className="px-3 py-2 text-slate-600">{p.interval}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {p.currency} {p.price}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{p.isActive ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-slate-600">{p.isDefault ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-slate-600">{p.limits.maxLinks}</td>
                  <td className="px-3 py-2">
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => void toggleActive(p)}
                      type="button"
                    >
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
