"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";

function publicShortUrl(shortCode: string): string | null {
  if (typeof window === "undefined") return `/r/${encodeURIComponent(shortCode)}`;
  return `${window.location.origin.replace(/\/$/, "")}/r/${encodeURIComponent(shortCode)}`;
}

function OpenShortLink({ shortCode }: { shortCode: string }) {
  const href = publicShortUrl(shortCode);
  if (!href) {
    return (
      <span className="text-xs text-slate-600" title="Uses current site origin">
        —
      </span>
    );
  }
  return (
    <a
      aria-label={`Open short link ${shortCode} in new tab`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 text-slate-200 transition hover:border-indigo-500 hover:bg-indigo-950/50 hover:text-white"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title="Open public /r link"
    >
      <span aria-hidden className="text-base leading-none">
        ↗
      </span>
    </a>
  );
}

export type AdminUrlRow = {
  id: string;
  ownerId: string;
  shortCode: string;
  originalUrl: string;
  status: string;
  clickCount: number;
  createdAt: string;
};

type Props = {
  items: AdminUrlRow[];
  token: string;
  onAfterMutation: () => void;
  onError: (message: string) => void;
};

export function AdminUrlTable({ items, token, onAfterMutation, onError }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    onError("");
    try {
      await fn();
      onAfterMutation();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const pause = (id: string) =>
    run(id, () => apiRequest(`/admin/urls/${id}/pause`, { method: "POST", token }));

  const activate = (id: string) =>
    run(id, () => apiRequest(`/admin/urls/${id}/activate`, { method: "POST", token }));

  const remove = (id: string) => {
    if (!window.confirm("Delete this short link? It will stop working and the owner will be notified.")) {
      return;
    }
    void run(id, () => apiRequest(`/admin/urls/${id}`, { method: "DELETE", token }));
  };

  const Actions = ({ row }: { row: AdminUrlRow }) => {
    const busy = busyId === row.id;
    const deleted = row.status === "DELETED";
    return (
      <div className="flex flex-wrap gap-2">
        {row.status === "ACTIVE" ? (
          <button
            className="rounded-md border border-amber-700/80 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-950/50 disabled:opacity-50"
            disabled={busy || deleted}
            onClick={() => void pause(row.id)}
            type="button"
          >
            {busy ? "…" : "Pause"}
          </button>
        ) : null}
        {row.status === "PAUSED" ? (
          <button
            className="rounded-md border border-emerald-700/80 px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-950/50 disabled:opacity-50"
            disabled={busy || deleted}
            onClick={() => void activate(row.id)}
            type="button"
          >
            {busy ? "…" : "Activate"}
          </button>
        ) : null}
        {!deleted ? (
          <button
            className="rounded-md border border-red-900/70 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-950/40 disabled:opacity-50"
            disabled={busy}
            onClick={() => void remove(row.id)}
            type="button"
          >
            Delete
          </button>
        ) : (
          <span className="text-xs text-slate-500">Removed</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm" key={item.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-white">{item.shortCode}</p>
              <OpenShortLink shortCode={item.shortCode} />
            </div>
            <p className="mt-1 break-all text-slate-300">{item.originalUrl}</p>
            <p className="mt-1 text-xs text-slate-500">Owner: {item.ownerId}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
              <span>Status: {item.status}</span>
              <span>Clicks: {item.clickCount}</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-3 border-t border-slate-800 pt-3">
              <Actions row={item} />
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/80">
            <tr>
              <th className="px-3 py-2">Short</th>
              <th className="w-12 px-2 py-2 text-center" title="Open public short URL">
                Visit
              </th>
              <th className="px-3 py-2">Original URL</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t border-slate-800" key={item.id}>
                <td className="px-3 py-2 font-medium text-white">{item.shortCode}</td>
                <td className="px-2 py-2 text-center">
                  <OpenShortLink shortCode={item.shortCode} />
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-slate-300">{item.originalUrl}</td>
                <td className="max-w-[8rem] truncate px-3 py-2 text-xs text-slate-500" title={item.ownerId}>
                  {item.ownerId}
                </td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2 tabular-nums">{item.clickCount}</td>
                <td className="px-3 py-2 text-slate-400">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <Actions row={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
