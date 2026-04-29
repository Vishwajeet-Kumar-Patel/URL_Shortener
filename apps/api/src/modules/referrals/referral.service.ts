import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { referralRepository } from "../../repositories/referral.repository";
import type { ReferralEarningsQuery } from "./referral.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class ReferralService {
  async getMyReferral(userId: string): Promise<{
    code: string;
    referralLink: string;
    totalReferred: number;
    totalEarnings: number;
  }> {
    const profile = await referralRepository.getOrCreateProfile(userId);
    if (!profile) {
      throw buildServiceError("Unable to initialize referral profile", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return {
      code: profile.code,
      referralLink: `${env.CLIENT_ORIGIN}/register?ref=${encodeURIComponent(profile.code)}`,
      totalReferred: profile.totalReferred,
      totalEarnings: profile.totalEarnings
    };
  }

  async listMyEarnings(userId: string, query: ReferralEarningsQuery): Promise<{
    items: Array<{
      id: string;
      referredUserId: string;
      invoiceId?: string;
      amount: number;
      grossAmount: number;
      ratePercent: number;
      createdAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await referralRepository.listEarningsByReferrer(userId, query);
    return {
      items: data.map((row) => ({
        id: row.id,
        referredUserId: String(row.referredUserId),
        invoiceId: row.invoiceId ? String(row.invoiceId) : undefined,
        amount: row.amount,
        grossAmount: row.grossAmount,
        ratePercent: row.ratePercent,
        createdAt: row.createdAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }
}

export const referralService = new ReferralService();
