import { prisma } from "../config/prisma";
import type { Role } from "../types/common";

type AnnouncementEntity = {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | Role;
  status: "DRAFT" | "SENT" | "FAILED";
  sentAt?: Date;
  stats: {
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
  };
  createdAt: Date;
};

const toEntity = (row: {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | Role;
  status: "DRAFT" | "SENT" | "FAILED";
  sentAt: Date | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
}): AnnouncementEntity => ({
  id: row.id,
  title: row.title,
  body: row.body,
  audience: row.audience,
  status: row.status,
  sentAt: row.sentAt ?? undefined,
  stats: {
    totalRecipients: row.totalRecipients,
    sentCount: row.sentCount,
    failedCount: row.failedCount
  },
  createdAt: row.createdAt
});

export class AnnouncementRepository {
  async create(input: {
    title: string;
    body: string;
    audience: "ALL" | Role;
    createdBy: string;
  }): Promise<AnnouncementEntity | null> {
    const row = await prisma.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        audience: input.audience,
        createdBy: input.createdBy
      }
    });
    return toEntity(row);
  }

  async getById(id: string): Promise<AnnouncementEntity | null> {
    const row = await prisma.announcement.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async markDelivery(
    id: string,
    input: {
      status: "DRAFT" | "SENT" | "FAILED";
      sentAt?: Date;
      totalRecipients: number;
      sentCount: number;
      failedCount: number;
    }
  ): Promise<void> {
    await prisma.announcement.update({
      where: { id },
      data: {
        status: input.status,
        sentAt: input.sentAt,
        totalRecipients: input.totalRecipients,
        sentCount: input.sentCount,
        failedCount: input.failedCount
      }
    });
  }

  async list(input: { page: number; limit: number }): Promise<{ data: AnnouncementEntity[]; total: number }> {
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.announcement.count()
    ]);
    return { data: data.map(toEntity), total };
  }
}

export const announcementRepository = new AnnouncementRepository();
