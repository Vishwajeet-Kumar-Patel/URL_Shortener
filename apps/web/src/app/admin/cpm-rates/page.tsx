"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { formButtonPrimaryClass, formInputClass } from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type CpmRate = {
  id: string;
  countryCode: string;
  cpm: number;
  currency: string;
  isActive: boolean;
  notes?: string;
  updatedAt: string;
};

export default function AdminCpmRatesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<CpmRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("IN");
  const [cpm, setCpm] = useState("2.5");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<CpmRate[]>("/admin/cpm-rates", { token });
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await apiRequest("/admin/cpm-rates", {
        method: "POST",
        token,
        body: {
          countryCode: countryCode.trim().toUpperCase(),
          cpm: Number(cpm),
          currency: currency.trim().toUpperCase(),
          isActive: true,
          notes: notes.trim() || undefined
        }
      });
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save CPM rate");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">CPM Rates</h1>
        <p className="mt-2 text-sm text-slate-500">Configure country-wise payouts used by monetization and reporting.</p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5" onSubmit={onSubmit}>
        <input className={formInputClass} onChange={(e) => setCountryCode(e.target.value)} placeholder="Country (IN)" value={countryCode} />
        <input className={formInputClass} onChange={(e) => setCpm(e.target.value)} placeholder="CPM" type="number" value={cpm} />
        <input className={formInputClass} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency" value={currency} />
        <input className={formInputClass} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" value={notes} />
        <button className={formButtonPrimaryClass} type="submit">Save rate</button>
      </form>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-slate-500">Loading...</p> : null}

      {!loading ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">CPM</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr className="border-t border-slate-200" key={row.id}>
                  <td className="px-3 py-2 text-white">{row.countryCode}</td>
                  <td className="px-3 py-2">{row.cpm}</td>
                  <td className="px-3 py-2">{row.currency}</td>
                  <td className="px-3 py-2">{row.isActive ? "ACTIVE" : "INACTIVE"}</td>
                  <td className="px-3 py-2 text-slate-500">{new Date(row.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
