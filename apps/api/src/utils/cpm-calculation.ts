// filepath: apps/api/src/utils/cpm-calculation.ts

import { CPM_CALCULATION_DECIMALS, MEMBER_EARNING_PERCENT, PLATFORM_MARGIN_PERCENT } from "../config/constants";

export interface CpmBreakdown {
  cpmRate: number;
  currency: string;
  totalPayoutPerClick: number;
  memberEarning: number;
  adminEarning: number;
}

export interface BulkCpmEarnings extends CpmBreakdown {
  clickCount: number;
  totalMemberEarning: number;
  totalAdminEarning: number;
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
  const totalPayoutPerClick = Number((cpmRate / 1000).toFixed(CPM_CALCULATION_DECIMALS));

  // Split between member and admin
  const memberEarning = Number((totalPayoutPerClick * MEMBER_EARNING_PERCENT).toFixed(CPM_CALCULATION_DECIMALS));
  const adminEarning = Number((totalPayoutPerClick * PLATFORM_MARGIN_PERCENT).toFixed(CPM_CALCULATION_DECIMALS));

  return {
    cpmRate,
    currency,
    totalPayoutPerClick,
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
): BulkCpmEarnings {
  const breakdown = calculateCpmBreakdown(cpmRate, currency);

  return {
    ...breakdown,
    clickCount,
    totalMemberEarning: Number((breakdown.memberEarning * clickCount).toFixed(CPM_CALCULATION_DECIMALS)),
    totalAdminEarning: Number((breakdown.adminEarning * clickCount).toFixed(CPM_CALCULATION_DECIMALS))
  };
}
