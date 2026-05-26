"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUrlTable, type AdminUrlRow } from "@/components/admin/admin-url-table";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type AdminUrlsResponse = {
  items: AdminUrlRow[];
};

export default function AdminUrlsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [items, setItems] = useState<AdminUrlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<AdminUrlsResponse>("/admin/urls?page=1&limit=50", { token });
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load URLs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">All URLs</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Pause links to block redirects (visitors see a paused response), activate when safe again, or delete
          to remove the short link permanently. Owners receive email notifications when status changes.
        </p>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {loading ? <p className="text-slate-500">Loading...</p> : null}
      {!loading && items.length === 0 && !error ? (
        <p className="text-slate-500">No URLs yet.</p>
      ) : null}
      {!loading && token && items.length > 0 ? (
        <AdminUrlTable
          items={items}
          onAfterMutation={load}
          onError={setError}
          token={token}
        />
      ) : null}
    </section>
  );
}
