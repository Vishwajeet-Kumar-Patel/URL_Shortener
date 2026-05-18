import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { EmailDeliveryStatus } from "../types/common";

type EmailLogEntity = Awaited<ReturnType<typeof prisma.emailLog.findUnique>>;

export class EmailLogRepository {
  async createEmailLog(payload: {
    userId: string;
    email: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: EmailDeliveryStatus;
  }): Promise<NonNullable<EmailLogEntity>> {
    return prisma.emailLog.create({
      data: {
        userId: payload.userId,
        email: payload.email,
        eventType: payload.eventType,
        payload: payload.payload as Prisma.InputJsonValue,
        status: payload.status
      }
    });
  }

  async updateDelivery(input: {
    id: string;
    status: EmailDeliveryStatus;
    providerMessageId?: string;
    error?: string;
    sentAt?: Date;
  }): Promise<void> {
    await prisma.emailLog.update({
      where: { id: input.id },
      data: {
        status: input.status,
        providerMessageId: input.providerMessageId,
        error: input.error,
        sentAt: input.sentAt
      }
    });
  }
}

export const emailLogRepository = new EmailLogRepository();
