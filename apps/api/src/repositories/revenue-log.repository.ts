import { prisma } from "../config/prisma";

export type RevenueLogSource =
  | "SUBSCRIPTION"
  | "CPM"
  | "REFERRAL"
  | "ADJUSTMENT"
  | "AD_POPUP_IMPRESSION"
  | "AD_POPUP_CLICK";

type RevenueLogEntity = Awaited<ReturnType<typeof prisma.revenueLog.findFirst>>;

export class RevenueLogRepository {
  async listInRange(since: Date, until: Date): Promise<NonNullable<RevenueLogEntity>[]> {
    return prisma.revenueLog.findMany({
      where: { createdAt: { gte: since, lte: until } },
      orderBy: { createdAt: "asc" }
    });
  }

  async countBySourceInRange(source: RevenueLogSource, since: Date, until: Date): Promise<number> {
    return prisma.revenueLog.count({
      where: {
        source,
        createdAt: { gte: since, lte: until }
      }
    });
  }

  async create(input: {
    source: RevenueLogSource;
    amount: number;
    currency?: string;
    country?: string;
    memberId?: string;
    planId?: string;
    sessionId?: string;
    invoiceId?: string;
    notes?: string;
  }): Promise<NonNullable<RevenueLogEntity>> {
    return prisma.revenueLog.create({
      data: {
        source: input.source,
        amount: input.amount,
        currency: input.currency ?? "INR",
        country: input.country,
        memberId: input.memberId,
        planId: input.planId,
        sessionId: input.sessionId,
        invoiceId: input.invoiceId,
        notes: input.notes
      }
    });
  }
}

export const revenueLogRepository = new RevenueLogRepository();
