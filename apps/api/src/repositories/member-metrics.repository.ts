import { prisma } from "../config/prisma";

export type MemberMetricsRecord = {
  id: string;
  memberId: string;
  totalAnonymousUsersBrought: number;
  totalAnonymousLinksGenerated: number;
  totalQualifiedClicks: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  thisMonthUsers: number;
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class MemberMetricsRepository {
  async getOrCreateMetrics(memberId: string): Promise<MemberMetricsRecord | null> {
    const existing = await prisma.memberMetrics.findUnique({ where: { memberId } });
    if (existing) return existing as MemberMetricsRecord;

    try {
      return (await prisma.memberMetrics.create({
        data: {
          memberId,
          totalAnonymousUsersBrought: 0,
          totalAnonymousLinksGenerated: 0,
          totalQualifiedClicks: 0,
          totalEarnings: 0,
          thisMonthEarnings: 0,
          thisMonthUsers: 0,
          lastCalculatedAt: new Date()
        }
      })) as MemberMetricsRecord;
    } catch {
      return null;
    }
  }

  async incrementUsersBrought(memberId: string, count: number = 1): Promise<boolean> {
    const result = await prisma.memberMetrics.updateMany({
      where: { memberId },
      data: {
        totalAnonymousUsersBrought: { increment: count },
        thisMonthUsers: { increment: count }
      }
    });
    return result.count > 0;
  }

  async incrementLinksGenerated(memberId: string, count: number = 1): Promise<boolean> {
    const result = await prisma.memberMetrics.updateMany({
      where: { memberId },
      data: { totalAnonymousLinksGenerated: { increment: count } }
    });
    return result.count > 0;
  }

  async incrementQualifiedClicks(memberId: string, count: number = 1): Promise<boolean> {
    const result = await prisma.memberMetrics.updateMany({
      where: { memberId },
      data: { totalQualifiedClicks: { increment: count } }
    });
    return result.count > 0;
  }

  async addEarnings(memberId: string, amount: number, isThisMonth: boolean = true): Promise<boolean> {
    const result = await prisma.memberMetrics.updateMany({
      where: { memberId },
      data: {
        totalEarnings: { increment: amount },
        ...(isThisMonth ? { thisMonthEarnings: { increment: amount } } : {})
      }
    });
    return result.count > 0;
  }

  async updateCalculatedAt(memberId: string): Promise<boolean> {
    const result = await prisma.memberMetrics.updateMany({ where: { memberId }, data: { lastCalculatedAt: new Date() } });
    return result.count > 0;
  }

  async findByMemberId(memberId: string): Promise<MemberMetricsRecord | null> {
    return (await prisma.memberMetrics.findUnique({ where: { memberId } })) as MemberMetricsRecord | null;
  }

  async getTopEarners(limit: number = 10): Promise<MemberMetricsRecord[]> {
    return (await prisma.memberMetrics.findMany({ orderBy: { totalEarnings: "desc" }, take: limit })) as MemberMetricsRecord[];
  }

  async getTopThisMonth(limit: number = 10): Promise<MemberMetricsRecord[]> {
    return (await prisma.memberMetrics.findMany({ orderBy: { thisMonthEarnings: "desc" }, take: limit })) as MemberMetricsRecord[];
  }

  async find(where: Record<string, unknown>): Promise<MemberMetricsRecord[]> {
    return (await prisma.memberMetrics.findMany({ where })) as MemberMetricsRecord[];
  }

  async resetMonthlyMetrics(): Promise<void> {
    await prisma.memberMetrics.updateMany({ data: { thisMonthEarnings: 0, thisMonthUsers: 0 } });
  }
}

export const memberMetricsRepository = new MemberMetricsRepository();
