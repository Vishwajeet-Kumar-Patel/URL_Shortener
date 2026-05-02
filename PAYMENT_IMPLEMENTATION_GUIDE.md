# Payment System Implementation & Fixes Guide

## PRIORITY 1: Standardize CPM Calculation (Critical)

### Current Conflict

There are **two conflicting payout systems** in the codebase:

**System 1: Fixed Payout per Click**
```typescript
// apps/api/src/config/constants.ts
export const PAYOUT_PER_QUALIFIED_CLICK = 0.5; // ₹0.50
export const PLATFORM_MARGIN_PERCENT = 0.2; // 20%

// Used in: redirect.service.ts
const amount = PAYOUT_PER_QUALIFIED_CLICK; // Always ₹0.50
```

**System 2: Country-Based CPM Rates**
```typescript
// apps/api/src/models/cpm-rate.model.ts
// Stores: countryCode, cpm, currency
// Example: India = ₹2.5 CPM

// Used in: payout-automation.service.ts
const amount = Number((rate.cpm / 1000).toFixed(6));
// Variable per country
```

### Why This Is a Problem

1. **Inconsistency:** Same click pays different amounts depending on which service processes it
2. **Unfair:** Member in India (low CPM) earns same as USA (high CPM)
3. **Unscalable:** Can't adjust rates without changing code

### Solution: Unified CPM-Based System

**Step 1: Update Constants**

```typescript
// apps/api/src/config/constants.ts

// Remove or deprecate:
// export const PAYOUT_PER_QUALIFIED_CLICK = 0.5;

// Add instead:
export const PLATFORM_MARGIN_PERCENT = 0.20; // Admin keeps 20%
export const MEMBER_EARNING_PERCENT = 0.80;  // Members keep 80%

// Default CPM rates (when country not found)
export const DEFAULT_CPM_RATE = 2.5; // USD or INR
export const DEFAULT_CURRENCY = "INR";

// CPM calculation precision
export const CPM_CALCULATION_DECIMALS = 6;
```

**Step 2: Unified Payout Calculation Helper**

```typescript
// apps/api/src/utils/cpm-calculation.ts

import { 
  PLATFORM_MARGIN_PERCENT, 
  MEMBER_EARNING_PERCENT,
  CPM_CALCULATION_DECIMALS 
} from "../config/constants";

export interface CpmBreakdown {
  cpmRate: number;
  currency: string;
  totalPayoutPerClick: number;
  memberEarning: number;
  adminEarning: number;
}

/**
 * Calculate member and admin earnings from CPM rate
 * @param cpmRate - CPM value (e.g., 2.5 for ₹2.5 or $2.5 per 1000 clicks)
 * @param currency - Currency code (USD, INR, etc.)
 * @returns Object with breakdown of earnings
 */
export function calculateCpmBreakdown(
  cpmRate: number,
  currency: string = "INR"
): CpmBreakdown {
  // CPM is per 1000 clicks, so divide by 1000
  const totalPayoutPerClick = cpmRate / 1000;
  
  // Split between member and admin
  const memberEarning = Number(
    (totalPayoutPerClick * MEMBER_EARNING_PERCENT).toFixed(CPM_CALCULATION_DECIMALS)
  );
  
  const adminEarning = Number(
    (totalPayoutPerClick * PLATFORM_MARGIN_PERCENT).toFixed(CPM_CALCULATION_DECIMALS)
  );
  
  return {
    cpmRate,
    currency,
    totalPayoutPerClick: Number(totalPayoutPerClick.toFixed(CPM_CALCULATION_DECIMALS)),
    memberEarning,
    adminEarning
  };
}

/**
 * Calculate bulk earnings for multiple clicks
 */
export function calculateBulkEarnings(
  cpmRate: number,
  clickCount: number,
  currency: string = "INR"
): CpmBreakdown & { totalMemberEarning: number; totalAdminEarning: number } {
  const breakdown = calculateCpmBreakdown(cpmRate, currency);
  
  return {
    ...breakdown,
    totalMemberEarning: Number((breakdown.memberEarning * clickCount).toFixed(CPM_CALCULATION_DECIMALS)),
    totalAdminEarning: Number((breakdown.adminEarning * clickCount).toFixed(CPM_CALCULATION_DECIMALS))
  };
}
```

**Step 3: Update redirect.service.ts**

```typescript
// apps/api/src/modules/redirect/redirect.service.ts

import { calculateCpmBreakdown } from "../../utils/cpm-calculation";

export class RedirectService {
  async creditQualifiedPayout(input: {
    ownerId: string;
    country?: string;
    shortCode: string;
    clickLogId: string;
  }): Promise<{ amount: number; currency: string } | null> {
    // ... existing URL and recipient logic ...

    // Get CPM rate by country
    const rate = await cpmRateRepository.getApplicableRate(input.country);
    if (!rate || rate.cpm <= 0) {
      // Fallback to default CPM
      const defaultRate = await cpmRateRepository.getApplicableRate("DEFAULT");
      if (!defaultRate) return null;
    }

    // Use unified calculation
    const breakdown = calculateCpmBreakdown(rate.cpm, rate.currency);
    
    // Credit member's wallet
    await walletService.credit(
      recipientId,
      breakdown.memberEarning,
      WALLET_TX_SOURCE.EARNING,
      `click:${input.clickLogId}`,
      `Qualified monetized completion payout (Code: ${input.shortCode}, CPM: ₹${rate.cpm})`
    );

    // Update member metrics
    await memberMetricsRepository.incrementQualifiedClicks(recipientId, 1);
    await memberMetricsRepository.addEarnings(recipientId, breakdown.memberEarning);

    // NOTE: Admin earning (breakdown.adminEarning) is implicitly recorded
    // in the platform margin tracking (future admin earnings dashboard)

    return {
      amount: breakdown.memberEarning,
      currency: rate.currency
    };
  }
}
```

**Step 4: Update payout-automation.service.ts**

```typescript
// apps/api/src/modules/redirect/payout-automation.service.ts

import { calculateCpmBreakdown, calculateBulkEarnings } from "../../utils/cpm-calculation";

export class PayoutAutomationService {
  async processSessionPayout(sessionId: string): Promise<{
    success: boolean;
    memberAmount?: number;
    adminAmount?: number;
    currency?: string;
    message: string;
  }> {
    const session = await redirectSessionRepository.findById(sessionId);
    if (!session?.isQualified || !session.memberId) {
      return { success: false, message: "Invalid session" };
    }

    // Get location from click log
    const clickLog = await clickRepository.findOne({ 
      /* sessionId filter */ 
    });
    const country = clickLog?.country || "DEFAULT";

    // Get CPM rate
    const rate = await cpmRateRepository.getApplicableRate(country);
    if (!rate || rate.cpm <= 0) {
      return { success: false, message: "No applicable CPM rate" };
    }

    // Use unified calculation
    const breakdown = calculateCpmBreakdown(rate.cpm, rate.currency);

    // Credit member
    await walletService.credit(
      String(session.memberId),
      breakdown.memberEarning,
      WALLET_TX_SOURCE.EARNING,
      `redirect-session:${sessionId}`,
      `Qualified click payout (Country: ${country}, CPM: ₹${rate.cpm})`
    );

    // Update metrics
    await memberMetricsRepository.incrementQualifiedClicks(String(session.memberId), 1);
    await memberMetricsRepository.addEarnings(String(session.memberId), breakdown.memberEarning);

    // Track admin earning for reporting
    // (This will be used in admin earnings dashboard)
    await revenueLogRepository.create({
      source: "CPM",
      country,
      amount: breakdown.adminEarning,
      currency: rate.currency,
      memberId: session.memberId,
      sessionId
    });

    return {
      success: true,
      memberAmount: breakdown.memberEarning,
      adminAmount: breakdown.adminEarning,
      currency: rate.currency,
      message: "Payout processed successfully"
    };
  }

  async calculateMemberEarnings(
    memberId: string,
    since: Date,
    until: Date
  ): Promise<{
    totalClicks: number;
    totalEarnings: number;
    byCountry: Array<{ country: string; clicks: number; earnings: number }>;
  }> {
    const sessions = await redirectSessionRepository.find({
      memberId,
      isQualified: true,
      createdAt: { $gte: since, $lte: until }
    });

    if (!sessions?.length) {
      return { totalClicks: 0, totalEarnings: 0, byCountry: [] };
    }

    let totalEarnings = 0;
    const byCountryMap: Record<string, { clicks: number; earnings: number }> = {};

    for (const session of sessions) {
      const clickLog = await clickRepository.findOne({ 
        /* sessionId */ 
      });
      const country = clickLog?.country || "DEFAULT";

      const rate = await cpmRateRepository.getApplicableRate(country);
      if (!rate || rate.cpm <= 0) continue;

      // Use unified calculation
      const breakdown = calculateCpmBreakdown(rate.cpm, rate.currency);

      if (!byCountryMap[country]) {
        byCountryMap[country] = { clicks: 0, earnings: 0 };
      }

      byCountryMap[country].clicks += 1;
      byCountryMap[country].earnings = Number(
        (byCountryMap[country].earnings + breakdown.memberEarning).toFixed(6)
      );
      totalEarnings += breakdown.memberEarning;
    }

    return {
      totalClicks: sessions.length,
      totalEarnings: Number(totalEarnings.toFixed(6)),
      byCountry: Object.entries(byCountryMap).map(([country, data]) => ({
        country,
        ...data
      }))
    };
  }
}
```

---

## PRIORITY 2: Implement Subscription Payment Endpoints

### Create Razorpay Service

```typescript
// apps/api/src/modules/payments/razorpay.service.ts

import Razorpay from "razorpay";
import crypto from "crypto";

const razorpayClient = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export interface CreateOrderInput {
  planId: string;
  userId: string;
  email: string;
  memberName: string;
}

export interface VerifyPaymentInput {
  paymentId: string;
  orderId: string;
  signature: string;
  planId: string;
  userId: string;
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
    // Get plan details
    const plan = await planRepository.findById(input.planId);
    if (!plan) throw new Error("Plan not found");

    // Create Razorpay order
    const order = await razorpayClient.orders.create({
      amount: Math.round(plan.price * 100), // Amount in paise
      currency: plan.currency,
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
      amount: plan.price,
      currency: plan.currency,
      keyId: process.env.RAZORPAY_KEY_ID!
    };
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(input: VerifyPaymentInput): boolean {
    const message = `${input.orderId}|${input.paymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
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
}

export const razorpayService = new RazorpayService();
```

### Create Payment Routes

```typescript
// apps/api/src/modules/payments/payment.routes.ts

import { Router } from "express";
import { 
  authMiddleware, 
  requireAuthenticatedUser, 
  ensureVerifiedUser,
  ensureActiveUser 
} from "../../middlewares/auth.middleware";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { paymentController } from "./payment.controller";

const paymentRouter = Router();

// Protected routes
paymentRouter.use(authMiddleware, requireAuthenticatedUser, ensureActiveUser, ensureVerifiedUser);

// Create order
paymentRouter.post(
  "/razorpay/create-order",
  validationMiddleware(createOrderSchema),
  asyncHandler((req, res) => paymentController.createOrder(req, res))
);

// Verify payment
paymentRouter.post(
  "/razorpay/verify",
  validationMiddleware(verifyPaymentSchema),
  asyncHandler((req, res) => paymentController.verifyPayment(req, res))
);

// Get payment status
paymentRouter.get(
  "/razorpay/:paymentId",
  asyncHandler((req, res) => paymentController.getPaymentStatus(req, res))
);

export { paymentRouter };
```

### Create Payment Controller

```typescript
// apps/api/src/modules/payments/payment.controller.ts

import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { razorpayService } from "./razorpay.service";
import { invoiceRepository } from "../../repositories/invoice.repository";
import { planRepository } from "../../repositories/plan.repository";
import { userRepository } from "../../repositories/user.repository";
import { INVOICE_STATUS, INVOICE_TYPE } from "../../types/common";

export class PaymentController {
  /**
   * Create Razorpay order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { planId } = req.body;

    // Get user and plan
    const [user, plan] = await Promise.all([
      userRepository.findById(userId),
      planRepository.findById(planId)
    ]);

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      return;
    }

    if (!plan) {
      res.status(StatusCodes.NOT_FOUND).json({ message: "Plan not found" });
      return;
    }

    // Create Razorpay order
    const order = await razorpayService.createOrder({
      planId,
      userId,
      email: user.email,
      memberName: user.firstName || "Member"
    });

    res.status(StatusCodes.OK).json(order);
  }

  /**
   * Verify and process payment
   */
  async verifyPayment(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { paymentId, orderId, signature, planId } = req.body;

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature({
      paymentId,
      orderId,
      signature,
      planId,
      userId
    });

    if (!isValid) {
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: "Invalid payment signature" 
      });
      return;
    }

    // Get payment details from Razorpay
    const paymentDetails = await razorpayService.getPaymentDetails(paymentId);

    if (paymentDetails.status !== "captured") {
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: "Payment not captured" 
      });
      return;
    }

    // Create invoice
    const invoice = await invoiceRepository.create({
      userId,
      type: INVOICE_TYPE.SUBSCRIPTION,
      status: INVOICE_STATUS.PAID,
      amount: paymentDetails.amount / 100, // Convert from paise
      currency: paymentDetails.currency,
      provider: "RAZORPAY",
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      providerSignature: signature,
      paidAt: new Date()
    });

    // Update user subscription
    const plan = await planRepository.findById(planId);
    if (plan) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 30 days from now

      await userRepository.updateSubscription(userId, {
        planId,
        expiresAt,
        invoiceId: invoice.id
      });
    }

    res.status(StatusCodes.OK).json({
      message: "Payment verified and processed",
      invoiceId: invoice.id,
      expiresAt: plan?.interval === "MONTHLY" 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null
    });
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    const { paymentId } = req.params;

    const paymentDetails = await razorpayService.getPaymentDetails(paymentId);

    res.status(StatusCodes.OK).json({
      paymentId,
      status: paymentDetails.status,
      amount: paymentDetails.amount / 100,
      currency: paymentDetails.currency,
      createdAt: new Date(paymentDetails.created_at * 1000)
    });
  }
}

export const paymentController = new PaymentController();
```

---

## PRIORITY 3: Implement Referral Commission Logic

### Update Payout Service for Referrals

```typescript
// In PayoutAutomationService.processSessionPayout()

// After crediting member, check for referrer
const createdByMember = await userRepository.findById(session.createdByMemberId);

if (createdByMember) {
  // Get referral profile
  const referralProfile = await referralRepository.findByOwnerId(
    String(createdByMember._id)
  );

  if (referralProfile) {
    // Calculate referral commission (configurable via admin settings)
    const referralCommissionRate = 0.15; // 15% of member earning
    const referralAmount = Number(
      (breakdown.memberEarning * referralCommissionRate).toFixed(6)
    );

    if (referralAmount > 0) {
      // Credit referrer's wallet
      await walletService.credit(
        String(createdByMember._id),
        referralAmount,
        WALLET_TX_SOURCE.REFERRAL_EARNING,
        `referral:${sessionId}`,
        `Referral commission from ${session.memberId} (15%)`
      );

      // Update referral metrics
      await referralRepository.incrementEarnings(
        String(createdByMember._id),
        referralAmount
      );
    }
  }
}
```

---

## PRIORITY 4: Create Admin Earnings Dashboard

### Create Revenue Model

```typescript
// apps/api/src/models/revenue-log.model.ts

import { model, models, Schema, Types } from "mongoose";

export interface RevenueLogDocument {
  source: "SUBSCRIPTION" | "CPM" | "REFERRAL" | "ADJUSTMENT";
  country?: string;
  amount: number;
  currency: string;
  memberId?: Types.ObjectId;
  planId?: Types.ObjectId;
  sessionId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const revenueLogSchema = new Schema<RevenueLogDocument>(
  {
    source: { 
      type: String, 
      enum: ["SUBSCRIPTION", "CPM", "REFERRAL", "ADJUSTMENT"],
      required: true,
      index: true
    },
    country: { type: String, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: "INR" },
    memberId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    sessionId: { type: Schema.Types.ObjectId, ref: "RedirectSession" },
    notes: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true, versionKey: false }
);

revenueLogSchema.index({ source: 1, createdAt: -1 }, { name: "idx_revenue_source_date" });
revenueLogSchema.index({ createdAt: 1 }, { name: "idx_revenue_date" });

export const RevenueLogModel = models.RevenueLog || model<RevenueLogDocument>("RevenueLog", revenueLogSchema);
```

### Create Admin Earnings Endpoint

```typescript
// apps/api/src/modules/admin/admin-earnings.service.ts

export class AdminEarningsService {
  /**
   * Get admin earnings breakdown
   */
  async getEarningsBreakdown(since: Date, until: Date): Promise<{
    totalEarnings: number;
    byCpmClicks: number;
    bySubscriptions: number;
    byReferrals: number;
    byCountry: Array<{ country: string; amount: number }>;
    byDate: Array<{ date: string; amount: number }>;
  }> {
    const logs = await revenueLogRepository.find({
      createdAt: { $gte: since, $lte: until }
    });

    let totalEarnings = 0;
    const bySource: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    for (const log of logs) {
      totalEarnings += log.amount;
      bySource[log.source] = (bySource[log.source] || 0) + log.amount;

      if (log.country) {
        byCountry[log.country] = (byCountry[log.country] || 0) + log.amount;
      }

      const dateStr = new Date(log.createdAt).toISOString().split("T")[0];
      byDate[dateStr] = (byDate[dateStr] || 0) + log.amount;
    }

    return {
      totalEarnings: Number(totalEarnings.toFixed(2)),
      byCpmClicks: bySource["CPM"] || 0,
      bySubscriptions: bySource["SUBSCRIPTION"] || 0,
      byReferrals: bySource["REFERRAL"] || 0,
      byCountry: Object.entries(byCountry).map(([country, amount]) => ({
        country,
        amount: Number(amount.toFixed(2))
      })),
      byDate: Object.entries(byDate).map(([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2))
      }))
    };
  }
}
```

---

## Implementation Checklist

- [ ] Create `cpm-calculation.ts` utility
- [ ] Update `constants.ts` with new CPM configuration
- [ ] Update `redirect.service.ts` to use unified CPM calculation
- [ ] Update `payout-automation.service.ts` to use unified CPM calculation
- [ ] Create `razorpay.service.ts`
- [ ] Create `payment.routes.ts` and `payment.controller.ts`
- [ ] Implement Razorpay webhook handler
- [ ] Create `revenue-log.model.ts`
- [ ] Implement referral commission logic in payout service
- [ ] Create admin earnings endpoint
- [ ] Create admin earnings frontend page
- [ ] Test complete subscription flow
- [ ] Test complete monetization flow
- [ ] Test referral earnings flow

