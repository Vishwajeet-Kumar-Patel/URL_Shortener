import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { URL_STATUS, type UrlAdMode, type UrlStatus } from "../types/common";

export type ShortUrlRecord = {
  id: string;
  ownerId: string;
  shortCode: string;
  originalUrl: string;
  normalizedUrl: string;
  status: UrlStatus;
  adMode: UrlAdMode;
  isCustomAlias: boolean;
  title: string | null;
  description: string | null;
  clickCount: number;
  rawOpenCount: number;
  funnelProgressCount: number;
  qualifiedCompletionCount: number;
  lastClickedAt: Date | null;
  expiresAt: Date | null;
  createdByRole: string;
  createdByMemberId: string | null;
  anonymousSessionId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class UrlRepository {
  async findByShortCode(shortCode: string): Promise<ShortUrlRecord | null> {
    return (await prisma.shortUrl.findUnique({ where: { shortCode } })) as ShortUrlRecord | null;
  }

  async existsByShortCode(shortCode: string): Promise<boolean> {
    return Boolean(await prisma.shortUrl.findUnique({ where: { shortCode }, select: { id: true } }));
  }

  async createOne(input: {
    ownerId: string;
    shortCode: string;
    originalUrl: string;
    normalizedUrl: string;
    adMode: UrlAdMode;
    isCustomAlias: boolean;
    title?: string;
    description?: string;
    expiresAt?: Date;
  }): Promise<ShortUrlRecord> {
    return prisma.shortUrl.create({
      data: {
        ownerId: input.ownerId,
        shortCode: input.shortCode,
        originalUrl: input.originalUrl,
        normalizedUrl: input.normalizedUrl,
        adMode: input.adMode,
        isCustomAlias: input.isCustomAlias,
        title: input.title,
        description: input.description,
        expiresAt: input.expiresAt
      }
    }) as Promise<ShortUrlRecord>;
  }

  async findByOwnerWithFilters(input: {
    ownerId: string;
    page: number;
    limit: number;
    status?: UrlStatus;
    search?: string;
  }): Promise<{ data: ShortUrlRecord[]; total: number }> {
    const where: Record<string, unknown> = { ownerId: input.ownerId };
    if (input.status) where.status = input.status;
    if (input.search) {
      where.OR = [
        { shortCode: { contains: input.search, mode: "insensitive" } },
        { originalUrl: { contains: input.search, mode: "insensitive" } },
        { title: { contains: input.search, mode: "insensitive" } }
      ];
    }

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.shortUrl.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.shortUrl.count({ where })
    ]);

    return { data: data as ShortUrlRecord[], total };
  }

  async countByOwner(ownerId: string): Promise<number> {
    return prisma.shortUrl.count({ where: { ownerId } });
  }

  async countByStatus(status: UrlStatus): Promise<number> {
    return prisma.shortUrl.count({ where: { status } });
  }

  async countAll(): Promise<number> {
    return prisma.shortUrl.count();
  }

  async findByCreatedByMemberId(memberId: string): Promise<ShortUrlRecord[]> {
    return (await prisma.shortUrl.findMany({ where: { createdByMemberId: memberId }, orderBy: { createdAt: "desc" } })) as ShortUrlRecord[];
  }

  async findByAnonymousSessionId(anonymousSessionId: string): Promise<ShortUrlRecord[]> {
    return (await prisma.shortUrl.findMany({ where: { anonymousSessionId }, orderBy: { createdAt: "desc" } })) as ShortUrlRecord[];
  }

  async listAllWithFilters(input: {
    page: number;
    limit: number;
    status?: UrlStatus;
    search?: string;
    ownerId?: string;
  }): Promise<{ data: ShortUrlRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (input.status) where.status = input.status;
    if (input.ownerId) where.ownerId = input.ownerId;
    if (input.search) {
      where.OR = [
        { shortCode: { contains: input.search, mode: "insensitive" } },
        { originalUrl: { contains: input.search, mode: "insensitive" } },
        { title: { contains: input.search, mode: "insensitive" } }
      ];
    }

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.shortUrl.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.shortUrl.count({ where })
    ]);
    return { data: data as ShortUrlRecord[], total };
  }

  async findByIdAndOwner(urlId: string, ownerId: string): Promise<ShortUrlRecord | null> {
    return (await prisma.shortUrl.findFirst({ where: { id: urlId, ownerId } })) as ShortUrlRecord | null;
  }

  async findById(urlId: string): Promise<ShortUrlRecord | null> {
    return (await prisma.shortUrl.findUnique({ where: { id: urlId } })) as ShortUrlRecord | null;
  }

  async updateStatus(urlId: string, status: UrlStatus): Promise<ShortUrlRecord | null> {
    try {
      return (await prisma.shortUrl.update({
        where: { id: urlId },
        data: { status, deletedAt: status === URL_STATUS.DELETED ? new Date() : null }
      })) as ShortUrlRecord;
    } catch {
      return null;
    }
  }

  async updateByOwner(urlId: string, ownerId: string, update: Partial<ShortUrlRecord>): Promise<ShortUrlRecord | null> {
    const current = await prisma.shortUrl.findFirst({ where: { id: urlId, ownerId } });
    if (!current) return null;
    return (await prisma.shortUrl.update({ where: { id: urlId }, data: update as Prisma.ShortUrlUpdateInput })) as ShortUrlRecord;
  }

  async incrementClickForActiveShortCode(shortCode: string): Promise<ShortUrlRecord | null> {
    const current = await prisma.shortUrl.findFirst({ where: { shortCode, status: URL_STATUS.ACTIVE } });
    if (!current) return null;
    return (await prisma.shortUrl.update({
      where: { id: current.id },
      data: {
        clickCount: { increment: 1 },
        rawOpenCount: { increment: 1 },
        lastClickedAt: new Date()
      }
    })) as ShortUrlRecord;
  }

  async incrementRawOpen(shortCode: string): Promise<ShortUrlRecord | null> {
    return this.incrementClickForActiveShortCode(shortCode);
  }

  async incrementFunnelProgress(shortCode: string): Promise<ShortUrlRecord | null> {
    const current = await prisma.shortUrl.findFirst({ where: { shortCode, status: URL_STATUS.ACTIVE } });
    if (!current) return null;
    return (await prisma.shortUrl.update({
      where: { id: current.id },
      data: { funnelProgressCount: { increment: 1 } }
    })) as ShortUrlRecord;
  }

  async incrementQualifiedCompletion(shortCode: string): Promise<ShortUrlRecord | null> {
    const current = await prisma.shortUrl.findFirst({ where: { shortCode, status: URL_STATUS.ACTIVE } });
    if (!current) return null;
    return (await prisma.shortUrl.update({
      where: { id: current.id },
      data: { qualifiedCompletionCount: { increment: 1 } }
    })) as ShortUrlRecord;
  }
}

export const urlRepository = new UrlRepository();
