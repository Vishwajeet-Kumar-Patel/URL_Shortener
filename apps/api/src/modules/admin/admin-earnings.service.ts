// filepath: apps/api/src/modules/admin/admin-earnings.service.ts

import { RevenueLogModel } from "../../models/revenue-log.model";
import { UserModel } from "../../models/user.model";
import { InvoiceModel } from "../../models/invoice.model";
import { INVOICE_STATUS, INVOICE_TYPE } from "../../types/common";

export interface EarningsBreakdown {
  totalEarnings: number;
  bySource: {
    subscriptions: number;
    cpmClicks: number;
    referrals: number;
    adjustments: number;
  };
  byAdEvents: {
    popupImpressions: number;
    popupClicks: number;
  };
  byCountry: Array<{ country: string; amount: number; clicks?: number }>;
  byDate: Array<{ date: string; amount: number }>;
  byPlan?: Array<{ planName: string; amount: number; memberCount: number }>;
}

export class AdminEarningsService {
  /**
   * Get admin earnings breakdown for a period
   */
  async getEarningsBreakdown(since: Date, until: Date): Promise<EarningsBreakdown> {
    // Get all revenue logs in the period
    const logs = await RevenueLogModel.find({
      createdAt: { $gte: since, $lte: until }
    }).lean();

    let totalEarnings = 0;
    const bySource: Record<string, number> = {
      SUBSCRIPTION: 0,
      CPM: 0,
      REFERRAL: 0,
      ADJUSTMENT: 0,
      AD_POPUP_IMPRESSION: 0,
      AD_POPUP_CLICK: 0
    };
    const byAdEvents = {
      popupImpressions: 0,
      popupClicks: 0
    };
    const byCountryMap: Record<string, number> = {};
    const byDateMap: Record<string, number> = {};

    // Process all revenue logs
    for (const log of logs) {
      const amount = Number(log.amount.toFixed(2));
      if (
        log.source === "SUBSCRIPTION" ||
        log.source === "CPM" ||
        log.source === "REFERRAL" ||
        log.source === "ADJUSTMENT"
      ) {
        totalEarnings += amount;
      }

      // Track by source
      bySource[log.source] = (bySource[log.source] || 0) + amount;

      if (log.source === "AD_POPUP_IMPRESSION") {
        byAdEvents.popupImpressions += 1;
      }
      if (log.source === "AD_POPUP_CLICK") {
        byAdEvents.popupClicks += 1;
      }

      // Track by country (for CPM)
      if (log.country) {
        byCountryMap[log.country] = (byCountryMap[log.country] || 0) + amount;
      }

      // Track by date
      const dateStr = new Date(log.createdAt).toISOString().split("T")[0];
      byDateMap[dateStr] = (byDateMap[dateStr] || 0) + amount;
    }

    // Get subscription revenue by plan (if not already in logs)
    const paidInvoices = await InvoiceModel.find({
       type: INVOICE_TYPE.PLAN_PURCHASE,
      status: INVOICE_STATUS.PAID,
      createdAt: { $gte: since, $lte: until }
    }).lean();

    const byPlanMap: Record<string, { amount: number; members: Set<string> }> = {};

    for (const invoice of paidInvoices) {
      const planId = (invoice as any).referenceId || (invoice as any).planId;
      if (!planId) continue;

      const amount = Number(invoice.amount.toFixed(2));
      if (!byPlanMap[planId]) {
        byPlanMap[planId] = { amount: 0, members: new Set() };
      }

      byPlanMap[planId].amount += amount;
      byPlanMap[planId].members.add(String(invoice.userId));
    }

    const byPlan = Object.entries(byPlanMap).map(([planId, data]) => ({
      planName: planId, // TODO: Get actual plan name from planId
      amount: data.amount,
      memberCount: data.members.size
    }));

    return {
      totalEarnings: Number(totalEarnings.toFixed(2)),
      bySource: {
        subscriptions: bySource.SUBSCRIPTION || 0,
        cpmClicks: bySource.CPM || 0,
        referrals: bySource.REFERRAL || 0,
        adjustments: bySource.ADJUSTMENT || 0
      },
      byAdEvents,
      byCountry: Object.entries(byCountryMap).map(([country, amount]) => ({
        country,
        amount: Number(amount.toFixed(2))
      })),
      byDate: Object.entries(byDateMap)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, amount]) => ({
          date,
          amount: Number(amount.toFixed(2))
        })),
      byPlan
    };
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(since: Date, until: Date): Promise<{
    totalEarnings: number;
    totalMembers: number;
    totalActiveSubscriptions: number;
    totalQualifiedClicks: number;
    averageEarningsPerMember: number;
  }> {
    const breakdown = await this.getEarningsBreakdown(since, until);

    // Get member count (approximate)
    const totalMembers = await UserModel.countDocuments({});

    // Get paid subscriptions
    const paidInvoices = await InvoiceModel.countDocuments({
      type: INVOICE_TYPE.PLAN_PURCHASE,
      status: INVOICE_STATUS.PAID,
      createdAt: { $gte: since, $lte: until }
    });

    const totalActiveSubscriptions = paidInvoices;
    const totalQualifiedClicks = await RevenueLogModel.countDocuments({
      source: "CPM",
      createdAt: { $gte: since, $lte: until }
    });

    return {
      totalEarnings: breakdown.totalEarnings,
      totalMembers,
      totalActiveSubscriptions,
      totalQualifiedClicks,
      averageEarningsPerMember: totalMembers > 0 ? breakdown.totalEarnings / totalMembers : 0
    };
  }

  /**
   * Log admin earnings (called when revenue event occurs)
   */
  async logRevenue(input: {
    source:
      | "SUBSCRIPTION"
      | "CPM"
      | "REFERRAL"
      | "ADJUSTMENT"
      | "AD_POPUP_IMPRESSION"
      | "AD_POPUP_CLICK";
    amount: number;
    currency?: string;
    country?: string;
    memberId?: string;
    planId?: string;
    sessionId?: string;
    invoiceId?: string;
    notes?: string;
  }): Promise<void> {
    await RevenueLogModel.create({
      source: input.source,
      amount: input.amount,
      currency: input.currency || "INR",
      country: input.country,
      memberId: input.memberId,
      planId: input.planId,
      sessionId: input.sessionId,
      invoiceId: input.invoiceId,
      notes: input.notes,
      createdAt: new Date()
    });
  }
}

export const adminEarningsService = new AdminEarningsService();
