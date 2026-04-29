"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";

type UserRow = { id: string; name: string; email: string; role: string; status: string; createdAt: string };
type Resp = { items: UserRow[]; pagination: { total: number } };

function UsersRolePage({ title, role, description }: { title: string; role: string; description: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      const data = await apiRequest<Resp>(`/admin/users?page=1&limit=100&role=${role}`, { token });
      setRows(data.items);
      setTotal(data.pagination.total);
    };
    void run();
  }, [token, role]);

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-slate-400">{description}</p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total" value={total} />
        <StatCard label="Active" value={rows.filter((r) => r.status === "ACTIVE").length} />
        <StatCard label="Banned" value={rows.filter((r) => r.status === "BANNED").length} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/70"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Created</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr className="border-t border-slate-800" key={u.id}><td className="px-3 py-2 text-white">{u.name}</td><td className="px-3 py-2 text-slate-300">{u.email}</td><td className="px-3 py-2">{u.status}</td><td className="px-3 py-2 text-slate-500">{new Date(u.createdAt).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}

export function AdminPublishersInner() {
  return <UsersRolePage description="Members generating monetized links and referral traffic." role="MEMBER" title="Publishers" />;
}

export function AdminAdvertisersInner() {
  return <UsersRolePage description="Accounts funding campaigns and driving paid traffic." role="ADVERTISER" title="Advertisers" />;
}
