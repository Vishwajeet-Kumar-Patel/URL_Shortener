// filepath: apps/api/src/modules/payments/razorpay.service.ts

import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../../config/env";

const razorpayClient = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "",
  key_secret: env.RAZORPAY_KEY_SECRET || ""
});

export interface CreateOrderInput {
  planId: string;
  userId: string;
  email: string;
  memberName: string;
  amount: number;
}

export interface VerifyPaymentInput {
  paymentId: string;
  orderId: string;
  signature: string;
}

export class RazorpayService {
  /**
   * Create Razorpay order for subscription
   */
  async createOrder(input: CreateOrderInput): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }> {
    // Create Razorpay order (amount in paise)
    const order = await razorpayClient.orders.create({
      amount: Math.round(input.amount * 100), // Convert to paise
      currency: "INR",
      receipt: `plan-${input.userId}-${Date.now()}`,
      customer_notify: 1,
      notes: {
        userId: input.userId,
        planId: input.planId,
        email: input.email,
        name: input.memberName
      }
    });

    return {
      orderId: order.id,
      amount: input.amount,
      currency: "INR",
      keyId: env.RAZORPAY_KEY_ID || ""
    };
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(input: VerifyPaymentInput): boolean {
    const message = `${input.orderId}|${input.paymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET || "")
      .update(message)
      .digest("hex");

    return generatedSignature === input.signature;
  }

  /**
   * Fetch payment details from Razorpay
   */
  async getPaymentDetails(paymentId: string): Promise<any> {
    return await razorpayClient.payments.fetch(paymentId);
  }

  /**
   * Fetch order details from Razorpay
   */
  async getOrderDetails(orderId: string): Promise<any> {
    return await razorpayClient.orders.fetch(orderId);
  }
}

export const razorpayService = new RazorpayService();
