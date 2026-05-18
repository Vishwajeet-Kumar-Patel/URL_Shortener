import { prisma } from "../config/prisma";

export type AnonymousSessionRecord = {
  id: string;
  memberId: string | null;
  referralCode: string | null;
  sessionToken: string;
  userAgent: string;
  ipHash: string;
  isValid: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class AnonymousSessionRepository {
  async createSession(input: {
    sessionToken: string;
    userAgent: string;
    ipHash: string;
    referralCode?: string;
    memberId?: string;
    ttlMinutes?: number;
  }): Promise<AnonymousSessionRecord | null> {
    const ttlMs = (input.ttlMinutes || 30) * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    try {
      return (await prisma.anonymousSession.create({
        data: {
          sessionToken: input.sessionToken,
          userAgent: input.userAgent,
          ipHash: input.ipHash,
          referralCode: input.referralCode,
          memberId: input.memberId,
          isValid: true,
          expiresAt
        }
      })) as AnonymousSessionRecord;
    } catch {
      return null;
    }
  }

  async findByToken(sessionToken: string): Promise<AnonymousSessionRecord | null> {
    return (await prisma.anonymousSession.findFirst({ where: { sessionToken, isValid: true } })) as AnonymousSessionRecord | null;
  }

  async invalidateSession(sessionToken: string): Promise<boolean> {
    const result = await prisma.anonymousSession.updateMany({ where: { sessionToken }, data: { isValid: false } });
    return result.count > 0;
  }

  async findByMemberId(
    memberId: string,
    query: { page: number; limit: number }
  ): Promise<{ data: AnonymousSessionRecord[]; total: number }> {
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      prisma.anonymousSession.findMany({
        where: { memberId },
        orderBy: { createdAt: "desc" },
        skip,
        take: query.limit
      }),
      prisma.anonymousSession.count({ where: { memberId } })
    ]);

    return { data: data as AnonymousSessionRecord[], total };
  }

  async countByMemberIdSince(memberId: string, since: Date): Promise<number> {
    return prisma.anonymousSession.count({ where: { memberId, createdAt: { gte: since } } });
  }

  async countUniqueByIpHashSince(ipHash: string, since: Date): Promise<number> {
    const sessions = await prisma.anonymousSession.findMany({ where: { ipHash, createdAt: { gte: since } }, select: { ipHash: true } });
    return new Set(sessions.map((s) => s.ipHash)).size;
  }
}

export const anonymousSessionRepository = new AnonymousSessionRepository();
