"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuthStore } from "@/store/auth.store";
import { apiRequest } from "@/lib/api-client";
import Link from "next/link";
import { AdminAppShell } from "@/components/admin/admin-app-shell";

type WithdrawalRequest = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: string;
  completedAt?: string;
};

type UserBalance = {
  availableBalance: number;
  pendingBalance: number;
};

export default function WithdrawalPage() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user?.id) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        // This endpoints would need to be created in the backend
        const balanceData = await apiRequest<UserBalance>(
          `/users/${user.id}/balance`,
          { method: "GET", token }
        );
        setBalance(balanceData);

        const requestsData = await apiRequest<WithdrawalRequest[]>(
          `/users/${user.id}/withdrawal-requests`,
          { method: "GET", token }
        );
        setRequests(requestsData || []);
      } catch (err) {
        // Mock data for demo
        setBalance({
          availableBalance: 0,
          pendingBalance: 0
        });
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user?.id]);

  const handleSubmitWithdrawal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const withdrawalAmount = parseFloat(amount);
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (balance && withdrawalAmount > balance.availableBalance) {
      setError("Amount exceeds available balance");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequest<WithdrawalRequest>(
        `/users/${user?.id}/withdraw`,
        {
          method: "POST",
          token,
          body: { amount: withdrawalAmount }
        }
      );

      setAmount("");
      setRequests([result, ...requests]);
      
      if (balance) {
        setBalance({
          ...balance,
          availableBalance: balance.availableBalance - withdrawalAmount,
          pendingBalance: balance.pendingBalance + withdrawalAmount
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminAppShell>
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
          <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-8 w-8"></div>
        </div>
      </AdminAppShell>
    );
  }

  return (
    <AdminAppShell>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/partner/referral-link" className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
            ← Back to Referral Code
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Withdrawal</h1>
          <p className="text-slate-300">Request a payout of your earnings</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-6">
            <p className="text-sm text-emerald-400 mb-2">Available Balance</p>
            <p className="text-3xl font-bold text-emerald-300">₹{balance?.availableBalance?.toFixed(2) || "0.00"}</p>
            <p className="mt-2 text-xs text-emerald-600">Ready to withdraw</p>
          </div>
          <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-6">
            <p className="text-sm text-amber-400 mb-2">Pending Balance</p>
            <p className="text-3xl font-bold text-amber-300">₹{balance?.pendingBalance?.toFixed(2) || "0.00"}</p>
            <p className="mt-2 text-xs text-amber-600">Processing withdrawal</p>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">Request Withdrawal</h2>

          <form onSubmit={handleSubmitWithdrawal} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Withdrawal Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-600 focus:outline-none"
              />
              <p className="mt-2 text-xs text-slate-400">
                Maximum: ₹{balance?.availableBalance?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Bank Account
              </label>
              <select className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white focus:border-indigo-600 focus:outline-none">
                <option>No bank account added</option>
              </select>
              <p className="mt-2 text-xs text-slate-400">
                Add a bank account in your profile settings
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-700 bg-rose-950/30 p-4">
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !amount || !balance?.availableBalance}
              className={`w-full rounded-lg px-6 py-3 font-semibold text-white transition-all ${
                submitting || !amount || !balance?.availableBalance
                  ? "bg-slate-700 cursor-not-allowed opacity-50"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              {submitting ? "Processing..." : "Submit Withdrawal Request"}
            </button>
          </form>
        </div>

        {/* Withdrawal History */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Withdrawal History</h2>

          {requests.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No withdrawal requests yet</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-800 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">₹{request.amount.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    request.status === "completed" ? "bg-emerald-950/50 text-emerald-400" :
                    request.status === "pending" ? "bg-amber-950/50 text-amber-400" :
                    request.status === "approved" ? "bg-blue-950/50 text-blue-400" :
                    "bg-rose-950/50 text-rose-400"
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </AdminAppShell>
  );
}
