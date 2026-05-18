import { prisma } from "../config/prisma";
import type { SubscriptionStatus } from "../types/common";

export type SubscriptionRecord = {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt: Date | null;
  renewAt: Date | null;
  canceledAt: Date | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  latestInvoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class SubscriptionRepository {
  async findActiveByUser(userId: string): Promise<SubscriptionRecord | null> {
    return (await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }]
      },
      orderBy: { createdAt: "desc" }
    })) as SubscriptionRecord | null;
  }

  async cancelActiveByUser(userId: string): Promise<void> {
    await prisma.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELED", canceledAt: new Date() }
    });
  }

  async createSubscription(input: {
    userId: string;
    planId: string;
    status: SubscriptionStatus;
    startsAt: Date;
    endsAt?: Date;
    renewAt?: Date;
    provider?: string;
    providerSubscriptionId?: string;
  }): Promise<SubscriptionRecord> {
    return prisma.subscription.create({ data: input }) as Promise<SubscriptionRecord>;
  }

  async updateStatus(subscriptionId: string, status: SubscriptionStatus): Promise<SubscriptionRecord | null> {
    try {
      return (await prisma.subscription.update({ where: { id: subscriptionId }, data: { status } })) as SubscriptionRecord;
    } catch {
      return null;
    }
  }
}

export const subscriptionRepository = new SubscriptionRepository();
