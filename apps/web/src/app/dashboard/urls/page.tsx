"use client";

import { useEffect, useState } from "react";
import { UrlTable } from "@/components/dashboard/url-table";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type UrlListResponse = {
  items: Array<{
    id: string;
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    status: string;
    clickCount: number;
    createdAt: string;
  }>;
};

export default function DashboardUrlsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [items, setItems] = useState<UrlListResponse["items"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await apiRequest<UrlListResponse>("/urls?page=1&limit=50", { token });
        setItems(data.items);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">My URLs</h1>
      {loading ? (
        <p className="text-slate-600">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">You have not created any URLs yet.</p>
        </div>
      ) : (
        <UrlTable items={items} />
      )}
    </section>
  );
}
