import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export type ClickLogRecord = {
  id: string;
  urlId: string;
  shortCode: string;
  ownerId: string;
  timestamp: Date;
  ipAddress: string;
  ipHash: string | null;
  userAgent: string;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  isUnique: boolean;
  jsEnabled: boolean;
  cookiesEnabled: boolean;
  isBot: boolean;
  isSuspicious: boolean;
  isQualified: boolean;
  qualificationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class ClickRepository {
  async createClickLog(payload: Prisma.ClickLogUncheckedCreateInput): Promise<ClickLogRecord> {
    return prisma.clickLog.create({ data: payload }) as Promise<ClickLogRecord>;
  }

  async markClickQualified(clickId: string): Promise<void> {
    await prisma.clickLog.updateMany({ where: { id: clickId }, data: { isQualified: true } });
  }

  async countClicksByOwner(ownerId: string): Promise<number> {
    return prisma.clickLog.count({ where: { ownerId, isQualified: true } });
  }

  async countClicksByUrl(urlId: string): Promise<number> {
    return prisma.clickLog.count({ where: { urlId, isQualified: true } });
  }

  async countUniqueClicksByOwner(ownerId: string): Promise<number> {
    return prisma.clickLog.count({ where: { ownerId, isUnique: true, isQualified: true } });
  }

  async countUniqueClicksByUrl(urlId: string): Promise<number> {
    return prisma.clickLog.count({ where: { urlId, isUnique: true, isQualified: true } });
  }

  async countClicksTotal(): Promise<number> {
    return prisma.clickLog.count({ where: { isQualified: true } });
  }

  async countUniqueClicksTotal(): Promise<number> {
    return prisma.clickLog.count({ where: { isUnique: true, isQualified: true } });
  }

  async existsRecentUniqueClick(input: {
    shortCode: string;
    ipHash: string;
    since: Date;
  }): Promise<boolean> {
    const existing = await prisma.clickLog.findFirst({
      where: {
        shortCode: input.shortCode,
        ipHash: input.ipHash,
        isQualified: true,
        timestamp: { gte: input.since }
      }
    });
    return Boolean(existing);
  }

  async getDailyClicks(input: {
    ownerId?: string;
    urlId?: string;
    days: number;
    uniqueOnly?: boolean;
  }): Promise<Array<{ date: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.max(1, input.days));

    const where: Prisma.ClickLogWhereInput = { timestamp: { gte: startDate }, isQualified: true };
    if (input.ownerId) where.ownerId = input.ownerId;
    if (input.urlId) where.urlId = input.urlId;
    if (input.uniqueOnly) where.isUnique = true;

    const rows = await prisma.clickLog.findMany({ where, select: { timestamp: true } });
    const counts = new Map<string, number>();
    for (const row of rows) {
      const date = row.timestamp.toISOString().slice(0, 10);
      counts.set(date, (counts.get(date) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  async getTopLinks(input: {
    ownerId?: string;
    days: number;
    limit: number;
  }): Promise<
    Array<{
      urlId: string;
      shortCode: string;
      totalClicks: number;
      uniqueClicks: number;
      originalUrl?: string;
      title?: string;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.max(1, input.days));

    const where: Record<string, unknown> = { timestamp: { gte: startDate }, isQualified: true };
    if (input.ownerId) where.ownerId = input.ownerId;

    const rows = await prisma.clickLog.findMany({ where, select: { urlId: true, shortCode: true, isUnique: true } });
    const aggregated = new Map<string, { urlId: string; shortCode: string; totalClicks: number; uniqueClicks: number }>();
    for (const row of rows) {
      const key = row.urlId;
      const current = aggregated.get(key) || { urlId: row.urlId, shortCode: row.shortCode, totalClicks: 0, uniqueClicks: 0 };
      current.totalClicks += 1;
      current.uniqueClicks += row.isUnique ? 1 : 0;
      aggregated.set(key, current);
    }

    const sorted = Array.from(aggregated.values()).sort((a, b) => b.totalClicks - a.totalClicks).slice(0, input.limit);
    const urls: Array<{ id: string; originalUrl: string; title: string | null }> = await prisma.shortUrl.findMany({
      where: { id: { in: sorted.map((row) => row.urlId) } },
      select: { id: true, originalUrl: true, title: true }
    });
    const urlById = new Map<string, { id: string; originalUrl: string; title: string | null }>(urls.map((url) => [url.id, url]));

    return sorted.map((row) => ({
      urlId: row.urlId,
      shortCode: row.shortCode,
      totalClicks: row.totalClicks,
      uniqueClicks: row.uniqueClicks,
      originalUrl: urlById.get(row.urlId)?.originalUrl,
      title: urlById.get(row.urlId)?.title ?? undefined
    }));
  }

  async getFieldBreakdown(input: {
    ownerId?: string;
    urlId?: string;
    days: number;
    field: "browser" | "os" | "deviceType" | "country" | "referrer";
    limit: number;
  }): Promise<Array<{ label: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.max(1, input.days));

    const where: Prisma.ClickLogWhereInput = { timestamp: { gte: startDate }, isQualified: true };
    if (input.ownerId) where.ownerId = input.ownerId;
    if (input.urlId) where.urlId = input.urlId;

    const rows = await prisma.clickLog.findMany({ where, select: { [input.field]: true } as never });
    const counts = new Map<string, number>();
    for (const row of rows as Array<Record<string, string | null>>) {
      const label = row[input.field] || "Unknown";
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, input.limit)
      .map(([label, count]) => ({ label, count }));
  }

  async getPeriodClicks(input: {
    ownerId?: string;
    period: "monthly" | "yearly";
    months?: number;
    years?: number;
    year?: number;
    uniqueOnly?: boolean;
  }): Promise<Array<{ period: string; count: number }>> {
    const now = new Date();
    let startDate = new Date();
    if (input.period === "monthly") {
      startDate = input.year ? new Date(input.year, 0, 1) : (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - Math.max(1, input.months ?? 12));
        return d;
      })();
    } else {
      const years = Math.max(1, input.years ?? 5);
      startDate.setFullYear(startDate.getFullYear() - years);
    }

    const where: Record<string, unknown> = { timestamp: { gte: startDate, lte: now }, isQualified: true };
    if (input.ownerId) where.ownerId = input.ownerId;
    if (input.uniqueOnly) where.isUnique = true;

    const rows = await prisma.clickLog.findMany({ where, select: { timestamp: true } });
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = input.period === "monthly" ? row.timestamp.toISOString().slice(0, 7) : String(row.timestamp.getUTCFullYear());
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count }));
  }
}

export const clickRepository = new ClickRepository();
