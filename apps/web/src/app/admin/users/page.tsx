"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { formSelectClass } from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdminUsersResponse = {
  items: AdminUserRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const ROLES = ["MEMBER", "ADVERTISER", "ADMIN"] as const;

export default function AdminUsersPage() {
  const token = useAuthStore((state) => state.accessToken);
  const actorId = useAuthStore((state) => state.user?.id ?? null);
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<AdminUsersResponse>("/admin/users?page=1&limit=50", { token });
      setData(res);
      const next: Record<string, string> = {};
      for (const u of res.items) {
        next[u.id] = u.role;
      }
      setRoleDraft(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (id: string, fn: () => Promise<void>) => {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const items = data?.items ?? [];

  const UserActions = ({ u }: { u: AdminUserRow }) => {
    const self = actorId === u.id;
    const busy = busyId === u.id;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={`${formSelectClass} max-w-[10rem] py-1.5 text-xs`}
            disabled={busy || self}
            onChange={(e) => setRoleDraft((d) => ({ ...d, [u.id]: e.target.value }))}
            value={roleDraft[u.id] ?? u.role}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            className="rounded-md border border-slate-600 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            disabled={busy || self || (roleDraft[u.id] ?? u.role) === u.role}
            onClick={() =>
              void run(u.id, () =>
                apiRequest(`/admin/users/${u.id}/role`, {
                  method: "PATCH",
                  token: token!,
                  body: { role: roleDraft[u.id] ?? u.role }
                })
              )
            }
            type="button"
          >
            Set role
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {u.status === "BANNED" ? (
            <button
              className="rounded-md border border-emerald-800 px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50"
              disabled={busy || self}
              onClick={() =>
                void run(u.id, () =>
                  apiRequest(`/admin/users/${u.id}/status`, {
                    method: "PATCH",
                    token: token!,
                    body: { status: "ACTIVE" }
                  })
                )
              }
              type="button"
            >
              Unban
            </button>
          ) : (
            <button
              className="rounded-md border border-amber-800 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
              disabled={busy || self}
              onClick={() =>
                void run(u.id, () => apiRequest(`/admin/users/${u.id}/ban`, { method: "POST", token: token! }))
              }
              type="button"
            >
              Ban
            </button>
          )}
          {!u.isEmailVerified ? (
            <button
              className="rounded-md border border-indigo-800 px-2 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-950/40 disabled:opacity-50"
              disabled={busy}
              onClick={() =>
                void run(u.id, () =>
                  apiRequest(`/admin/users/${u.id}/verify-email`, { method: "POST", token: token! })
                )
              }
              type="button"
            >
              Verify email
            </button>
          ) : null}
          <button
            className="rounded-md border border-red-900/70 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-950/40 disabled:opacity-50"
            disabled={busy || self}
            onClick={() => {
              if (!window.confirm("Soft-delete this user? They will be marked deleted and logged out.")) {
                return;
              }
              void run(u.id, () => apiRequest(`/admin/users/${u.id}`, { method: "DELETE", token: token! }));
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Users</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Ban accounts, verify emails, adjust roles, or soft-delete accounts. You cannot modify your own
              role, ban yourself, or delete your own account from this screen.
            </p>
          </div>
          {data ? (
            <p className="text-sm text-slate-400">
              {data.pagination.total} user{data.pagination.total === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? <p className="text-slate-400">Loading...</p> : null}
      {error ? <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="text-slate-400">No users found.</p>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((u) => (
              <article className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm" key={u.id}>
                <p className="font-medium text-white">{u.name}</p>
                <p className="mt-1 break-all text-slate-300">{u.email}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{u.role}</span>
                  <span>·</span>
                  <span>{u.status}</span>
                  <span>·</span>
                  <span>{u.isEmailVerified ? "verified" : "unverified"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{new Date(u.createdAt).toLocaleString()}</p>
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <UserActions u={u} />
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Email OK</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="min-w-[14rem] px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr className="border-t border-slate-800" key={u.id}>
                    <td className="px-3 py-2 font-medium text-white">{u.name}</td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-slate-300" title={u.email}>
                      {u.email}
                    </td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">{u.status}</td>
                    <td className="px-3 py-2 text-slate-400">{u.isEmailVerified ? "yes" : "no"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <UserActions u={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
