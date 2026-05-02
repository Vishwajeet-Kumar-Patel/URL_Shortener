import type { InvoiceType } from "../../types/common";

export type CreateOrderInput = {
  invoiceType: InvoiceType;
  planId?: string;
  campaignId?: string;
  amount?: number;
  currency?: string;
};

export type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  mode?: "LIVE" | "MOCK";
};

/** Returned by Razorpay Checkout `handler` after successful payment. */
export type RazorpayVerifyInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
