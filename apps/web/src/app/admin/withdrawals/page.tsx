"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { formInputClass } from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type WithdrawalRow = {
  id: string;
  amount: number;
  status: string;
  payoutMethod?: string;
  payoutAccount?: string;
  memo?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  processedAt?: string;
};

type WithdrawalListResponse = {
  items: WithdrawalRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const pipeline = [
  {
    step: "PENDING",
    title: "Submitted",
    detail: "Publisher requested a payout. Review bank/UPI details and fraud signals before approving."
  },
  {
    step: "APPROVED",
    title: "Approved",
    detail: "Finance agrees to pay. Mark as PAID after the transfer hits their account."
  },
  { step: "PAID", title: "Paid", detail: "The payout has been sent and the approved balance is now settled." },
  {
    step: "REJECTED",
    title: "Rejected",
    detail: "No money movement. Add a memo so support knows why (KYC, limits, duplicate request)."
  }
] as const;

export default function AdminWithdrawalsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<WithdrawalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<WithdrawalListResponse>("/withdrawals/admin?page=1&limit=100", { token });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load withdrawals");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchStatus = async (id: string, status: "APPROVED" | "REJECTED" | "PAID") => {
    if (!token) return;
    setBusyId(id);
    try {
      await apiRequest(`/withdrawals/admin/${id}`, {
        method: "PATCH",
        token,
        body: { status, memo: memos[id]?.trim() || undefined }
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const items = data?.items ?? [];
  const pending = items.filter((w) => w.status === "PENDING").length;
  const approved = items.filter((w) => w.status === "APPROVED").length;

  return (
    <section className="space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-white">Withdrawals</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Withdrawals move publisher earnings out of their in-app wallet into real bank rails. Each card (or
          table row) is one request with immutable timestamps so you can prove who approved what.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pipeline.map((p) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4" key={p.step}>
            <p className="font-mono text-xs text-blue-600">{p.step}</p>
            <p className="mt-1 text-sm font-semibold text-white">{p.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{p.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/95 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting action</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-200">{pending}</p>
          <p className="mt-1 text-xs text-slate-500">Needs approve or reject with an optional memo.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/95 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready to pay out</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-300">{approved}</p>
          <p className="mt-1 text-xs text-slate-500">Approved rows waiting for the Mark paid button.</p>
        </div>
      </div>

      {loading ? <p className="text-slate-500">Loading...</p> : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No withdrawal requests</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            When publishers cash out, you will see amount, payout method, account mask, and timestamps here.
            The pipeline cards above explain how each status should be handled operationally.
          </p>
        </div>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <div className="space-y-4">
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payout</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="min-w-[12rem] px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr className="border-t border-slate-200" key={w.id}>
                    <td className="px-3 py-2 font-semibold text-white">INR {w.amount}</td>
                    <td className="px-3 py-2 text-slate-600">{w.status}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-500">
                      {w.payoutMethod ?? "—"} · {w.payoutAccount ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {new Date(w.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <WithdrawalActions
                        busy={busyId === w.id}
                        memo={memos[w.id] ?? ""}
                        onMemo={(v) => setMemos((m) => ({ ...m, [w.id]: v }))}
                        onPatch={(s) => void patchStatus(w.id, s)}
                        row={w}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-4 lg:hidden">
            {items.map((w) => (
              <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm" key={w.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">INR {w.amount}</p>
                    <p className="mt-1 text-slate-500">Status: {w.status}</p>
                    <p className="mt-1 text-slate-500">
                      {w.payoutMethod ?? "—"} · {w.payoutAccount ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(w.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <WithdrawalActions
                    busy={busyId === w.id}
                    memo={memos[w.id] ?? ""}
                    onMemo={(v) => setMemos((m) => ({ ...m, [w.id]: v }))}
                    onPatch={(s) => void patchStatus(w.id, s)}
                    row={w}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WithdrawalActions({
  row,
  memo,
  onMemo,
  onPatch,
  busy
}: {
  row: WithdrawalRow;
  memo: string;
  onMemo: (v: string) => void;
  onPatch: (s: "APPROVED" | "REJECTED" | "PAID") => void;
  busy: boolean;
}) {
  return (
    <div className="flex min-w-[12rem] flex-col gap-2">
      <input
        className={`${formInputClass} text-xs`}
        onChange={(e) => onMemo(e.target.value)}
        placeholder="Admin memo (optional)"
        value={memo}
      />
      {row.status === "PENDING" ? (
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => onPatch("APPROVED")}
            type="button"
          >
            Approve
          </button>
          <button
            className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => onPatch("REJECTED")}
            type="button"
          >
            Reject
          </button>
        </div>
      ) : null}
      {row.status === "APPROVED" ? (
        <button
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => onPatch("PAID")}
          type="button"
        >
          Mark paid
        </button>
      ) : null}
    </div>
  );
}
