import { createHmac } from "crypto";
import { StatusCodes } from "http-status-codes";
import type { HydratedDocument } from "mongoose";
import { env } from "../../config/env";
import type { InvoiceDocument } from "../../models/invoice.model";
import { planRepository } from "../../repositories/plan.repository";
import { invoiceRepository } from "../../repositories/invoice.repository";
import { paymentTransactionRepository } from "../../repositories/payment-transaction.repository";
import { subscriptionRepository } from "../../repositories/subscription.repository";
import { campaignRepository } from "../../repositories/campaign.repository";
import { referralRepository } from "../../repositories/referral.repository";
import { walletService } from "../wallet/wallet.service";
import {
  INVOICE_STATUS,
  INVOICE_TYPE,
  PAYMENT_PROVIDER,
  SUBSCRIPTION_STATUS,
  WALLET_TX_SOURCE
} from "../../types/common";
import type { CreateOrderInput, RazorpayOrderResponse, RazorpayVerifyInput } from "./payment.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

const toPaise = (amount: number): number => Math.round(amount * 100);
const REFERRAL_RATE_PERCENT = 5;

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

type PaidInvoice = HydratedDocument<InvoiceDocument>;

export class PaymentService {
  async createRazorpayOrder(userId: string, input: CreateOrderInput): Promise<{ invoiceId: string; order: RazorpayOrderResponse }> {
    let amount = input.amount ?? 0;
    let referenceId: string | undefined;

    if (input.invoiceType === INVOICE_TYPE.PLAN_PURCHASE) {
      if (!input.planId) {
        throw buildServiceError("Plan ID is required", StatusCodes.BAD_REQUEST);
      }
      const plan = await planRepository.findById(input.planId);
      if (!plan || !plan.isActive) {
        throw buildServiceError("Plan not found", StatusCodes.NOT_FOUND);
      }
      amount = plan.price;
      referenceId = plan.id;
    }

    if (input.invoiceType === INVOICE_TYPE.CAMPAIGN) {
      if (!input.campaignId) {
        throw buildServiceError("Campaign ID is required", StatusCodes.BAD_REQUEST);
      }
      const campaign = await campaignRepository.findByIdAndOwner(input.campaignId, userId);
      if (!campaign) {
        throw buildServiceError("Campaign not found", StatusCodes.NOT_FOUND);
      }
      amount = input.amount ?? campaign.budgetTotal;
      referenceId = campaign.id;
    }

    if (input.invoiceType === INVOICE_TYPE.WALLET_TOPUP) {
      if (!input.amount || input.amount <= 0) {
        throw buildServiceError("Amount is required", StatusCodes.BAD_REQUEST);
      }
      amount = input.amount;
    }

    if (amount <= 0) {
      throw buildServiceError("Invalid amount", StatusCodes.BAD_REQUEST);
    }

    const invoice = await invoiceRepository.createInvoice({
      userId,
      type: input.invoiceType,
      status: INVOICE_STATUS.PENDING,
      amount,
      currency: input.currency ?? "INR",
      provider: PAYMENT_PROVIDER.RAZORPAY,
      referenceId
    });

    const invoiceId = String(invoice._id);

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw buildServiceError(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in apps/api/.env and restart API.",
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }

    const payload = {
      amount: toPaise(amount),
      currency: input.currency ?? "INR",
      receipt: invoiceId
    };

    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");

    const response = await fetch(`${env.RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw buildServiceError("Failed to create Razorpay order", StatusCodes.BAD_GATEWAY);
    }

    const order = (await response.json()) as RazorpayOrderResponse;
    await invoiceRepository.updateProviderOrder(invoiceId, { providerOrderId: order.id });

    return { invoiceId, order };
  }

  /**
   * Confirms checkout using Razorpay's order_id|payment_id HMAC (key secret only — no webhook).
   */
  async verifyRazorpayPayment(userId: string, input: RazorpayVerifyInput): Promise<void> {
    if (!env.RAZORPAY_KEY_SECRET) {
      throw buildServiceError(
        "Razorpay is not configured. Set RAZORPAY_KEY_SECRET in apps/api/.env and restart API.",
        StatusCodes.SERVICE_UNAVAILABLE
      );
    }

    const body = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
    const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(body).digest("hex");

    if (expected !== input.razorpay_signature) {
      throw buildServiceError("Invalid payment signature", StatusCodes.UNAUTHORIZED);
    }

    const invoice = await invoiceRepository.findByProviderOrderId(input.razorpay_order_id);
    if (!invoice) {
      throw buildServiceError("Invoice not found", StatusCodes.NOT_FOUND);
    }

    if (String(invoice.userId) !== userId) {
      throw buildServiceError("Payment does not belong to this account", StatusCodes.FORBIDDEN);
    }

    if (invoice.status === INVOICE_STATUS.PAID) {
      return;
    }

    if (invoice.status !== INVOICE_STATUS.PENDING) {
      throw buildServiceError("Invoice cannot be completed", StatusCodes.BAD_REQUEST);
    }

    await paymentTransactionRepository.createTransaction({
      invoiceId: String(invoice._id),
      provider: PAYMENT_PROVIDER.RAZORPAY,
      eventType: "checkout.verify",
      payload: {
        razorpay_order_id: input.razorpay_order_id,
        razorpay_payment_id: input.razorpay_payment_id
      },
      signature: input.razorpay_signature
    });

    const paid = await invoiceRepository.markPaid(String(invoice._id), {
      providerPaymentId: input.razorpay_payment_id,
      providerSignature: input.razorpay_signature
    });

    if (!paid) {
      return;
    }

    await this.applyPaidInvoiceFulfillment(paid);
  }

  private async applyPaidInvoiceFulfillment(paid: PaidInvoice): Promise<void> {
    if (paid.type === INVOICE_TYPE.PLAN_PURCHASE) {
      const plan = await planRepository.findById(String(paid.referenceId));
      if (plan) {
        await subscriptionRepository.cancelActiveByUser(String(paid.userId));
        const startsAt = new Date();
        const endsAt =
          plan.interval === "MONTHLY"
            ? addMonths(startsAt, 1)
            : plan.interval === "YEARLY"
              ? addMonths(startsAt, 12)
              : undefined;

        await subscriptionRepository.createSubscription({
          userId: String(paid.userId),
          planId: String(plan.id),
          status: SUBSCRIPTION_STATUS.ACTIVE,
          startsAt,
          endsAt,
          renewAt: endsAt,
          provider: PAYMENT_PROVIDER.RAZORPAY
        });
      }
    }

    if (paid.type === INVOICE_TYPE.WALLET_TOPUP) {
      await walletService.credit(
        String(paid.userId),
        paid.amount,
        WALLET_TX_SOURCE.TOPUP,
        String(paid._id)
      );
    }

    if (paid.type === INVOICE_TYPE.CAMPAIGN && paid.referenceId) {
      await campaignRepository.applyFundingAfterPayment(
        String(paid.referenceId),
        String(paid.userId),
        paid.amount
      );
    }

    const referrer = await referralRepository.findByReferredUser(String(paid.userId));
    if (referrer) {
      const earning = await referralRepository.addEarning({
        referrerId: String(referrer.ownerId),
        referredUserId: String(paid.userId),
        invoiceId: String(paid._id),
        grossAmount: paid.amount,
        ratePercent: REFERRAL_RATE_PERCENT
      });
      if (earning) {
        await walletService.credit(
          String(referrer.ownerId),
          earning.amount,
          WALLET_TX_SOURCE.ADJUSTMENT,
          String(paid._id),
          `Referral commission (${REFERRAL_RATE_PERCENT}% from referred user payment)`
        );
      }
    }
  }
}

export const paymentService = new PaymentService();
