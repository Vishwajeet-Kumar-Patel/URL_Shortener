import { StatusCodes } from "http-status-codes";
import { cpmRateRepository } from "../../repositories/cpm-rate.repository";
import { memberMetricsRepository } from "../../repositories/member-metrics.repository";
import { walletService } from "../wallet/wallet.service";
import { redirectSessionRepository } from "../../repositories/redirect-session.repository";
import { clickRepository } from "../../repositories/click.repository";
import { WALLET_TX_SOURCE } from "../../types/common";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class PayoutAutomationService {
  /**
   * Process payout for a qualified redirect session
   */
  async processSessionPayout(sessionId: string): Promise<{
    success: boolean;
    amount?: number;
    currency?: string;
    message: string;
  }> {
    const session = await redirectSessionRepository.findById(sessionId);
    if (!session) {
      throw buildServiceError("Session not found", StatusCodes.NOT_FOUND);
    }

    if (!session.isQualified) {
      return {
        success: false,
        message: "Session is not qualified for payout"
      };
    }

    if (!session.memberId) {
      return {
        success: false,
        message: "Session has no member attribution"
      };
    }

    // Get the click log to retrieve location info
    const clicks = await clickRepository.find({ /* query */ });
    let country: string | undefined;

    if (clicks && clicks.length > 0) {
      country = clicks[0].country;
    }

    // Apply CPM rate
    const rate = await cpmRateRepository.getApplicableRate(country);
    if (!rate || rate.cpm <= 0) {
      return {
        success: false,
        message: "No applicable CPM rate for this location"
      };
    }

    const amount = Number((rate.cpm / 1000).toFixed(6));
    if (amount <= 0) {
      return {
        success: false,
        message: "Calculated payout amount is zero"
      };
    }

    // Credit the member's wallet
    await walletService.credit(
      String(session.memberId),
      amount,
      WALLET_TX_SOURCE.EARNING,
      `redirect-session:${sessionId}`,
      `Qualified click payout (CPM: ${rate.cpm})`
    );

    // Update member metrics
    await memberMetricsRepository.incrementQualifiedClicks(String(session.memberId), 1);
    await memberMetricsRepository.addEarnings(String(session.memberId), amount, true);

    return {
      success: true,
      amount,
      currency: rate.currency,
      message: "Payout processed successfully"
    };
  }

  /**
   * Calculate earnings from qualified clicks in a time period
   */
  async calculateMemberEarnings(
    memberId: string,
    since: Date,
    until: Date
  ): Promise<{
    totalClicks: number;
    totalEarnings: number;
    byCountry: Array<{ country: string; clicks: number; earnings: number }>;
  }> {
    // Query qualified redirect sessions for this member
    const sessions = await redirectSessionRepository.find({
      memberId,
      isQualified: true,
      createdAt: { $gte: since, $lte: until }
    });

    if (!sessions || sessions.length === 0) {
      return {
        totalClicks: 0,
        totalEarnings: 0,
        byCountry: []
      };
    }

    let totalEarnings = 0;
    const byCountryMap: Record<string, { clicks: number; earnings: number }> = {};

    for (const session of sessions) {
      // Get associated click log
      const clickLog = await clickRepository.findOne({ /* sessionId */ });
      if (!clickLog) continue;

      const country = clickLog.country || "UNKNOWN";
      const rate = await cpmRateRepository.getApplicableRate(country);

      if (rate && rate.cpm > 0) {
        const earnings = Number((rate.cpm / 1000).toFixed(6));

        if (!byCountryMap[country]) {
          byCountryMap[country] = { clicks: 0, earnings: 0 };
        }

        byCountryMap[country].clicks += 1;
        byCountryMap[country].earnings += earnings;
        totalEarnings += earnings;
      }
    }

    const byCountry = Object.entries(byCountryMap).map(([country, data]) => ({
      country,
      ...data
    }));

    return {
      totalClicks: sessions.length,
      totalEarnings: Number(totalEarnings.toFixed(6)),
      byCountry
    };
  }

  /**
   * Batch process daily payouts for all members
   * (Intended to be called by a scheduled job)
   */
  async processDailyPayouts(): Promise<{
    processedMembers: number;
    totalAmount: number;
    successCount: number;
    failureCount: number;
  }> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all metrics (members with activity)
    const allMetrics = await memberMetricsRepository.find({});

    let processedMembers = 0;
    let totalAmount = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const metrics of allMetrics || []) {
      processedMembers += 1;

      try {
        const earnings = await this.calculateMemberEarnings(
          String(metrics.memberId),
          yesterday,
          today
        );

        if (earnings.totalEarnings > 0) {
          // Credit the wallet
          await walletService.credit(
            String(metrics.memberId),
            earnings.totalEarnings,
            WALLET_TX_SOURCE.EARNING,
            `daily-payout:${yesterday.toISOString().split("T")[0]}`,
            `Daily payout: ${earnings.totalClicks} qualified clicks`
          );

          totalAmount += earnings.totalEarnings;
          successCount += 1;
        }
      } catch (error) {
        failureCount += 1;
        console.error(`Failed to process payout for member ${metrics.memberId}:`, error);
      }
    }

    return {
      processedMembers,
      totalAmount: Number(totalAmount.toFixed(6)),
      successCount,
      failureCount
    };
  }
}

export const payoutAutomationService = new PayoutAutomationService();
