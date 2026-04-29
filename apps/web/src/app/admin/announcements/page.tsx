"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import {
  formButtonPrimaryClass,
  formInputClass,
  formLabelClass,
  formSelectClass,
  formCardClass
} from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  sentAt?: string;
  stats: { totalRecipients: number; sentCount: number; failedCount: number };
  createdAt: string;
};

type ListResp = { items: Announcement[] };

export default function AdminAnnouncementsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [activeOnly, setActiveOnly] = useState(true);
  const [maxRetries, setMaxRetries] = useState(2);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token) return;
    const data = await apiRequest<ListResp>("/admin/announcements?page=1&limit=30", { token });
    setItems(data.items);
  };

  useEffect(() => {
    void load();
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/admin/announcements", {
        method: "POST",
        token,
        body: { title, body, audience, activeOnly, maxRetries }
      });
      setTitle("");
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send announcement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-indigo-300">Communication</p>
        <h1 className="text-3xl font-semibold text-white">Announcements</h1>
        <p className="max-w-3xl text-sm text-slate-400">Send production announcements with active-user targeting and built-in retry queue behavior for failed deliveries.</p>
      </header>

      <form className={`${formCardClass} space-y-4`} onSubmit={onSubmit}>
        <div>
          <label className={formLabelClass}>Title</label>
          <input className={formInputClass} onChange={(e) => setTitle(e.target.value)} required value={title} />
        </div>
        <div>
          <label className={formLabelClass}>Body</label>
          <textarea className={`${formInputClass} min-h-40`} onChange={(e) => setBody(e.target.value)} required value={body} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={formLabelClass}>Audience</label>
            <select className={formSelectClass} onChange={(e) => setAudience(e.target.value)} value={audience}>
              <option value="ALL">ALL</option>
              <option value="MEMBER">MEMBER</option>
              <option value="ADVERTISER">ADVERTISER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div>
            <label className={formLabelClass}>Retry attempts</label>
            <input className={formInputClass} max={5} min={0} onChange={(e) => setMaxRetries(Number(e.target.value || 0))} type="number" value={maxRetries} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 md:pt-8">
            <input checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} type="checkbox" />
            Send to ACTIVE users only
          </label>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className={formButtonPrimaryClass} disabled={busy} type="submit">{busy ? "Sending..." : "Send announcement"}</button>
      </form>

      <div className="space-y-3">
        {items.map((a) => (
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4" key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-white">{a.title}</h2>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{a.audience} · {a.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{a.body}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Recipients: {a.stats.totalRecipients}</span>
              <span>Sent: {a.stats.sentCount}</span>
              <span>Failed: {a.stats.failedCount}</span>
              <span>Created: {new Date(a.createdAt).toLocaleString()}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
