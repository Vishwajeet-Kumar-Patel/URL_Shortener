import { prisma } from "../config/prisma";

type AnnouncementJobEntity = Awaited<ReturnType<typeof prisma.announcementJob.findFirst>>;

export class AnnouncementJobRepository {
  async enqueueMany(input: Array<{ announcementId: string; userId: string; email: string; maxRetries: number }>): Promise<void> {
    const rows = input
      .filter((row) => Boolean(row.announcementId && row.userId))
      .map((row) => ({
        announcementId: row.announcementId,
        userId: row.userId,
        email: row.email,
        maxRetries: row.maxRetries,
        attempts: 0,
        status: "PENDING" as const,
        nextAttemptAt: new Date()
      }));
    if (rows.length === 0) return;
    await prisma.announcementJob.createMany({ data: rows, skipDuplicates: true });
  }

  async claimBatch(limit: number): Promise<NonNullable<AnnouncementJobEntity>[]> {
    const now = new Date();
    const jobs = await prisma.announcementJob.findMany({
      where: {
        status: "PENDING",
        nextAttemptAt: { lte: now }
      },
      orderBy: { nextAttemptAt: "asc" },
      take: limit
    });

    const ids = jobs.map((j) => j.id);
    if (ids.length > 0) {
      await prisma.announcementJob.updateMany({
        where: { id: { in: ids }, status: "PENDING" },
        data: { status: "PROCESSING" }
      });
    }

    return prisma.announcementJob.findMany({ where: { id: { in: ids }, status: "PROCESSING" } });
  }

  async markSent(id: string): Promise<void> {
    await prisma.announcementJob.update({
      where: { id },
      data: {
        status: "SENT",
        nextAttemptAt: new Date()
      }
    });
  }

  async markFailure(id: string, input: { error: string; nextAttemptAt: Date; final: boolean }): Promise<void> {
    await prisma.announcementJob.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        status: input.final ? "FAILED" : "PENDING",
        lastError: input.error,
        nextAttemptAt: input.nextAttemptAt
      }
    });
  }

  async getStatsByAnnouncement(announcementId: string): Promise<{ total: number; sent: number; failed: number }> {
    const [total, sent, failed] = await Promise.all([
      prisma.announcementJob.count({ where: { announcementId } }),
      prisma.announcementJob.count({ where: { announcementId, status: "SENT" } }),
      prisma.announcementJob.count({ where: { announcementId, status: "FAILED" } })
    ]);
    return { total, sent, failed };
  }

  async countPendingByAnnouncement(announcementId: string): Promise<number> {
    return prisma.announcementJob.count({
      where: {
        announcementId,
        status: { in: ["PENDING", "PROCESSING"] }
      }
    });
  }
}

export const announcementJobRepository = new AnnouncementJobRepository();
