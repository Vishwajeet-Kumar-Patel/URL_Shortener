import { StatusCodes } from "http-status-codes";
import { calculateCpmBreakdown } from "../../utils/cpm-calculation";
import { DEFAULT_CURRENCY, DEFAULT_CPM_RATE } from "../../config/constants";
import { cpmRateRepository } from "../../repositories/cpm-rate.repository";
import { memberMetricsRepository } from "../../repositories/member-metrics.repository";
import { userRepository } from "../../repositories/user.repository";
import { redirectSessionRepository } from "../../repositories/redirect-session.repository";
import { walletService } from "../wallet/wallet.service";
import { adminEarningsService } from "../admin/admin-earnings.service";
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
    memberAmount?: number;
    adminAmount?: number;
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

    // Get CPM rate by country
    let rate = await cpmRateRepository.getApplicableRate(session.country);
    if (!rate || rate.cpm <= 0) {
      // Fallback to default rate - use proper type casting
      rate = await cpmRateRepository.getApplicableRate(DEFAULT_CURRENCY);
      if (!rate) {
        rate = {
          cpm: DEFAULT_CPM_RATE,
          currency: DEFAULT_CURRENCY
        } as never;
      }
    }

    // Use unified CPM calculation
    const breakdown = calculateCpmBreakdown(rate.cpm, rate.currency);

    // Credit the member's wallet
    await walletService.credit(
      String(session.memberId),
      breakdown.memberEarning,
      WALLET_TX_SOURCE.EARNING,
      `redirect-session:${sessionId}`,
      `Qualified click payout (Country: ${session.country || "UNKNOWN"}, CPM: ${rate.cpm})`
    );

    // Update member metrics
    await memberMetricsRepository.incrementQualifiedClicks(String(session.memberId), 1);
    await memberMetricsRepository.addEarnings(String(session.memberId), breakdown.memberEarning, true);

    // REFERRAL EARNING: Check if this member was referred by someone
    const member = await userRepository.findById(String(session.memberId));
    if (member && (member as any).referredBy) {
      const referrerId = (member as any).referredBy;
      
      // Calculate referral commission (15% of member earning)
      const referralCommissionRate = 0.15;
      const referralAmount = Number((breakdown.memberEarning * referralCommissionRate).toFixed(6));

      if (referralAmount > 0) {
        // Credit referrer's wallet
        await walletService.credit(
          referrerId,
          referralAmount,
          WALLET_TX_SOURCE.EARNING,
          `referral-session:${sessionId}`,
          `Referral commission (15% from referred member)`
        );

        // Update referrer's metrics
        await memberMetricsRepository.addEarnings(referrerId, referralAmount);

        // Update referral profile (if repository has these methods)
        // TODO: verify referralRepository has these methods
        // const referralProfile = await referralRepository.getByOwnerId(referrerId);
        // if (referralProfile) {
        //   await referralRepository.incrementEarnings(referrerId, referralAmount);
        // }
      }
    }

    // Log admin revenue for analytics
    await adminEarningsService.logRevenue({
      source: "CPM",
      amount: breakdown.adminEarning,
      currency: rate.currency,
      country: session.country,
      memberId: String(session.memberId),
      sessionId,
      notes: `CPM ${breakdown.adminEarning} (20% margin from ${rate.cpm} CPM rate)`
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
    _memberId: string,
    _since: Date,
    _until: Date
  ): Promise<{
    totalClicks: number;
    totalEarnings: number;
    byCountry: Array<{ country: string; clicks: number; earnings: number }>;
  }> {
    // TODO: Implement proper query for qualified redirect sessions by date range
    // For now, returning empty result to fix compilation
    // This method needs repository updates to support date-range queries
    
    return {
      totalClicks: 0,
      totalEarnings: 0,
      byCountry: []
    };

    // Commented out old implementation that references non-existent methods
    /*
    let totalEarnings = 0;
    const byCountryMap: Record<string, { clicks: number; earnings: number }> = {};

    for (const session of sessions) {
      // Get associated click log
      // const clickLog = await clickRepository.findOne({ sessionId: session.clickLogId });

    // if (!clickLog) continue;
    //   const country = clickLog.country || "UNKNOWN";
    //   let rate = await cpmRateRepository.getApplicableRate(country);
    //   
    //   if (!rate || rate.cpm <= 0) {
    //     rate = await cpmRateRepository.getApplicableRate(DEFAULT_CURRENCY);
    //     if (!rate) continue;
    //   }
    //   const breakdown = calculateCpmBreakdown(rate.cpm, rate.currency);
    //   if (!byCountryMap[country]) {
    //     byCountryMap[country] = { clicks: 0, earnings: 0 };
    //   }
    //   byCountryMap[country].clicks += 1;
    //   byCountryMap[country].earnings = Number(
    //     (byCountryMap[country].earnings + breakdown.memberEarning).toFixed(6)
    //   );
    //   totalEarnings += breakdown.memberEarning;
    // */
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
    // TODO: Implement batch payout logic once repositories support required queries
    return {
      processedMembers: 0,
      totalAmount: 0,
      successCount: 0,
      failureCount: 0
    };
    /*
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
    */
  }
}

export const payoutAutomationService = new PayoutAutomationService();
