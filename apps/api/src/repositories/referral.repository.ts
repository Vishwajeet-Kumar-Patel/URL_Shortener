import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type ReferralRecord = {
  id: string;
  ownerId: string;
  code: string;
  referredUserIds: string[];
  totalReferred: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
};

type ReferralEarningRecord = {
  id: string;
  referrerId: string;
  referredUserId: string;
  invoiceId?: string | null;
  amount: number;
  grossAmount: number;
  ratePercent: number;
  createdAt: Date;
  updatedAt: Date;
};

const makeCode = (): string => Math.random().toString(36).slice(2, 10).toUpperCase();

export class ReferralRepository {
  async getOrCreateProfile(ownerId: string): Promise<ReferralRecord | null> {
    const existing = await prisma.referral.findUnique({ where: { ownerId } });
    if (existing) return existing;

    for (let i = 0; i < 5; i += 1) {
      try {
        return await prisma.referral.create({
          data: {
            ownerId,
            code: makeCode(),
            referredUserIds: [],
            totalReferred: 0,
            totalEarnings: 0
          }
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
      }
    }

    return null;
  }

  async findByCode(code: string): Promise<ReferralRecord | null> {
    return prisma.referral.findUnique({ where: { code: code.trim().toUpperCase() } });
  }

  async attachReferredUser(code: string, referredUserId: string): Promise<boolean> {
    const profile = await this.findByCode(code);
    if (!profile) return false;
    if (profile.ownerId === referredUserId) return false;

    if (profile.referredUserIds.includes(referredUserId)) {
      return true;
    }

    const hasOtherReferrer = await prisma.referral.findFirst({
      where: { referredUserIds: { has: referredUserId } }
    });
    if (hasOtherReferrer) return false;

    await prisma.referral.update({
      where: { id: profile.id },
      data: {
        referredUserIds: { push: referredUserId },
        totalReferred: { increment: 1 }
      }
    });

    return true;
  }

  async findByReferredUser(referredUserId: string): Promise<ReferralRecord | null> {
    return prisma.referral.findFirst({ where: { referredUserIds: { has: referredUserId } } });
  }

  async addEarning(input: {
    referrerId: string;
    referredUserId: string;
    invoiceId?: string;
    grossAmount: number;
    ratePercent: number;
  }): Promise<ReferralEarningRecord | null> {
    const amount = Number(((input.grossAmount * input.ratePercent) / 100).toFixed(2));
    if (amount <= 0) return null;

    const row = await prisma.referralEarning.create({
      data: {
        referrerId: input.referrerId,
        referredUserId: input.referredUserId,
        invoiceId: input.invoiceId,
        amount,
        grossAmount: input.grossAmount,
        ratePercent: input.ratePercent
      }
    });

    await prisma.referral.update({
      where: { ownerId: input.referrerId },
      data: { totalEarnings: { increment: amount } }
    });

    return row;
  }

  async listEarningsByReferrer(
    referrerId: string,
    input: { page: number; limit: number }
  ): Promise<{ data: ReferralEarningRecord[]; total: number }> {
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.referralEarning.findMany({
        where: { referrerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: input.limit
      }),
      prisma.referralEarning.count({ where: { referrerId } })
    ]);

    return { data, total };
  }
}

export const referralRepository = new ReferralRepository();