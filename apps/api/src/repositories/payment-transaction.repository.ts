import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { PaymentProvider } from "../types/common";

export type PaymentTransactionRecord = {
  id: string;
  invoiceId: string | null;
  provider: PaymentProvider;
  eventType: string;
  payload: Record<string, unknown>;
  signature: string | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class PaymentTransactionRepository {
  async createTransaction(input: {
    invoiceId?: string;
    provider: PaymentProvider;
    eventType: string;
    payload: Record<string, unknown>;
    signature?: string;
    receivedAt?: Date;
  }): Promise<PaymentTransactionRecord> {
    return prisma.paymentTransaction.create({
      data: {
        invoiceId: input.invoiceId,
        provider: input.provider,
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
        signature: input.signature,
        receivedAt: input.receivedAt ?? new Date()
      }
    }) as Promise<PaymentTransactionRecord>;
  }

  async listByInvoice(invoiceId: string): Promise<PaymentTransactionRecord[]> {
    return (await prisma.paymentTransaction.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" }
    })) as PaymentTransactionRecord[];
  }

  async listAll(input: { page: number; limit: number; provider?: PaymentProvider }): Promise<{ data: PaymentTransactionRecord[]; total: number }> {
    const filter: Prisma.PaymentTransactionWhereInput = {};
    if (input.provider) {
      filter.provider = input.provider;
    }
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.paymentTransaction.findMany({ where: filter, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.paymentTransaction.count({ where: filter })
    ]);
    return { data: data as PaymentTransactionRecord[], total };
  }
}

export const paymentTransactionRepository = new PaymentTransactionRepository();
