"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { formButtonPrimaryClass, formInputClass, formLabelClass } from "@/components/ui/form-classes";
import { useAuthStore } from "@/store/auth.store";

type WalletSummary = { balance: number; pendingAmount: number };

type LedgerEntry = {
  id: string;
  type: string;
  source: string;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  memo?: string;
  createdAt: string;
};

type LedgerResponse = {
  items: LedgerEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type WithdrawalRow = {
  id: string;
  amount: number;
  status: string;
  payoutMethod?: string;
  payoutAccount?: string;
  createdAt: string;
};

type WithdrawalListResponse = {
  items: WithdrawalRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function DashboardWalletPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [sum, led, wd] = await Promise.all([
        apiRequest<WalletSummary>("/wallet/summary", { token }),
        apiRequest<LedgerResponse>("/wallet/ledger?page=1&limit=25", { token }),
        apiRequest<WithdrawalListResponse>("/withdrawals?page=1&limit=20", { token })
      ]);
      setSummary(sum);
      setLedger(led.items);
      setWithdrawals(wd.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const onWithdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    setMessage(null);
    try {
      await apiRequest("/withdrawals", {
        method: "POST",
        token,
        body: {
          amount: Number(fd.get("amount")),
          payoutMethod: String(fd.get("payoutMethod") ?? "").trim() || undefined,
          payoutAccount: String(fd.get("payoutAccount") ?? "").trim() || undefined,
          memo: String(fd.get("memo") ?? "").trim() || undefined
        }
      });
      setMessage("Withdrawal requested.");
      form.reset();
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    }
  };

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Wallet</h1>
        <p className="mt-1 text-sm text-slate-400">Balances, ledger activity, and payout requests.</p>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      {loading ? <p className="text-slate-400">Loading...</p> : null}

      {summary && !loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Available Balance</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">₹{summary.balance.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">Ready for withdrawal</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending Withdrawals</p>
            <p className="mt-2 text-2xl font-semibold text-amber-400">₹{summary.pendingAmount.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">Under admin review</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Earnings</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-400">₹{(summary.balance + summary.pendingAmount).toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">Available + pending</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Request withdrawal</h2>
        <form className="mt-4 grid gap-4 text-sm sm:grid-cols-2" onSubmit={onWithdraw}>
          <div>
            <label className={formLabelClass} htmlFor="wd-amount">
              Amount (INR)
            </label>
            <input className={formInputClass} id="wd-amount" min={1} name="amount" required type="number" />
          </div>
          <div>
            <label className={formLabelClass} htmlFor="wd-method">
              Payout method
            </label>
            <input className={formInputClass} id="wd-method" name="payoutMethod" placeholder="UPI / Bank" />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass} htmlFor="wd-account">
              Payout account / UPI ID
            </label>
            <input className={formInputClass} id="wd-account" name="payoutAccount" required />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass} htmlFor="wd-memo">
              Note (optional)
            </label>
            <input className={formInputClass} id="wd-memo" name="memo" />
          </div>
          <button className={`${formButtonPrimaryClass} sm:col-span-2`} type="submit">
            Submit request
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">Your withdrawals</h2>
        {withdrawals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {withdrawals.map((w) => (
              <li className="flex flex-wrap justify-between gap-2 border-b border-slate-800 pb-2" key={w.id}>
                <span>INR {w.amount}</span>
                <span className="text-slate-400">{w.status}</span>
                <span className="text-xs text-slate-500">{new Date(w.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">Ledger</h2>
        {ledger.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No ledger entries yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Balance after</th>
                  <th className="px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr className="border-t border-slate-800" key={row.id}>
                    <td className="px-3 py-2 text-slate-200">{row.type}</td>
                    <td className="px-3 py-2 text-slate-400">{row.source}</td>
                    <td className="px-3 py-2 text-slate-200">{row.amount}</td>
                    <td className="px-3 py-2 text-slate-200">{row.balanceAfter}</td>
                    <td className="px-3 py-2 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
