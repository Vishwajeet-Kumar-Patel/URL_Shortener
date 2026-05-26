"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { apiRequest } from "@/lib/api-client";
import { loadRazorpay } from "@/lib/razorpay";
import { useAuthStore } from "@/store/auth.store";

type Plan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: "FREE" | "MONTHLY" | "YEARLY";
  isDefault: boolean;
  limits: {
    maxLinks: number;
    analyticsAccess: boolean;
    customAlias: boolean;
    campaignAccess: boolean;
    payoutLimit: number;
  };
};

type PlanResponse = { items: Plan[] };

type SubscriptionSummary = {
  id: string;
  planId: string;
  planName: string;
  interval: "FREE" | "MONTHLY" | "YEARLY";
  status: string;
  startsAt: string;
  endsAt?: string;
  renewAt?: string;
} | null;

type OrderResponse = {
  invoiceId: string;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
  };
};

type RazorpayCheckoutSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

const formatPrice = (plan: Plan): string => {
  if (plan.interval === "FREE" || plan.price === 0) return "Free";
  const amount = plan.currency === "INR" ? `INR ${plan.price}` : `${plan.currency} ${plan.price}`;
  const suffix = plan.interval === "YEARLY" ? "/yr" : "/mo";
  return `${amount}${suffix}`;
};

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

export default function PricingPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSummary>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<PlanResponse>("/plans");
      setPlans(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load plans");
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<SubscriptionSummary>("/subscriptions/me", { token });
      setSubscription(data);
    } catch {
      setSubscription(null);
    }
  };

  useEffect(() => {
    void loadPlans();
    void loadSubscription();
  }, [token]);

  const currentPlanId = subscription?.planId;

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.price - b.price),
    [plans]
  );

  const handleCheckout = async (plan: Plan) => {
    if (!token) {
      router.push("/login");
      return;
    }

    if (plan.interval === "FREE") {
      setMessage("You are already on the free plan.");
      return;
    }

    if (!keyId) {
      setMessage("Payments are not configured yet. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to the web env.");
      return;
    }

    setProcessingId(plan.id);
    setMessage(null);

    try {
      const data = await apiRequest<OrderResponse>("/payments/razorpay/order", {
        method: "POST",
        token,
        body: { invoiceType: "PLAN_PURCHASE", planId: plan.id }
      });

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout");
      }

      const checkout = new window.Razorpay({
        key: keyId,
        order_id: data.order.id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "PurpleMerit Links",
        description: `${plan.name} plan`,
        handler: async (response: RazorpayCheckoutSuccess) => {
          try {
            await apiRequest<{ verified: boolean }>("/payments/razorpay/verify", {
              method: "POST",
              token,
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            });
            setMessage("Payment successful. Your subscription is updated.");
            void loadSubscription();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Payment verification failed");
          }
        }
      });

      checkout.open();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to start checkout");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10 md:px-8">
        <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Simple pricing for every stage</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Start free and scale as your traffic grows. Paid plans use Razorpay Checkout; the app confirms payment with
          your key secret (no webhook).
        </p>
        {subscription ? (
          <div className="mt-6 rounded-2xl border border-indigo-900/60 bg-blue-50 p-4 text-sm text-blue-500">
            <p className="font-semibold">Current plan: {subscription.planName}</p>
            <p className="mt-1 text-blue-600">Status: {subscription.status}</p>
          </div>
        ) : null}
        {message ? <p className="mt-4 text-sm text-amber-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-500">
              Loading plans...
            </div>
          ) : null}
          {!loading && sortedPlans.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-500">
              No plans configured yet.
            </div>
          ) : null}
          {sortedPlans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <article
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                key={plan.id}
              >
                <h2 className="text-lg font-semibold sm:text-xl">{plan.name}</h2>
                <p className="mt-1 text-2xl font-bold text-blue-600 sm:text-3xl">{formatPrice(plan)}</p>
                <p className="mt-2 flex-1 text-sm text-slate-600 sm:text-base">{plan.description ?? ""}</p>
                <ul className="mt-4 space-y-1 text-xs text-slate-500 sm:text-sm">
                  <li>Max links: {plan.limits.maxLinks}</li>
                  <li>Custom alias: {plan.limits.customAlias ? "Yes" : "No"}</li>
                  <li>Campaigns: {plan.limits.campaignAccess ? "Yes" : "No"}</li>
                </ul>
                <button
                  className="mt-5 w-full min-h-[2.75rem] rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                  disabled={processingId === plan.id || isCurrent}
                  onClick={() => void handleCheckout(plan)}
                  type="button"
                >
                  {isCurrent ? "Current plan" : processingId === plan.id ? "Processing..." : "Choose plan"}
                </button>
              </article>
            );
          })}
        </div>
        <div className="mt-6 text-sm text-slate-500">
          Already subscribed? Manage invoices in your{" "}
          <Link className="text-blue-600 hover:text-blue-500" href="/dashboard/billing">
            billing dashboard
          </Link>.
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
