import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { InvoiceStatus, InvoiceType, PaymentProvider } from "../types/common";

export type InvoiceRecord = {
  id: string;
  userId: string;
  type: InvoiceType;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  provider: PaymentProvider | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerSignature: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class InvoiceRepository {
  async createInvoice(input: {
    userId: string;
    type: InvoiceType;
    status: InvoiceStatus;
    amount: number;
    currency: string;
    provider?: PaymentProvider;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<InvoiceRecord> {
    return prisma.invoice.create({
      data: {
        userId: input.userId,
        type: input.type,
        status: input.status,
        amount: input.amount,
        currency: input.currency,
        provider: input.provider,
        referenceId: input.referenceId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
      }
    }) as Promise<InvoiceRecord>;
  }

  async updateProviderOrder(invoiceId: string, input: { providerOrderId: string }): Promise<InvoiceRecord | null> {
    try {
      return (await prisma.invoice.update({
        where: { id: invoiceId },
        data: { providerOrderId: input.providerOrderId }
      })) as InvoiceRecord;
    } catch {
      return null;
    }
  }

  async findByProviderOrderId(providerOrderId: string): Promise<InvoiceRecord | null> {
    return (await prisma.invoice.findFirst({ where: { providerOrderId } })) as InvoiceRecord | null;
  }

  async findById(invoiceId: string): Promise<InvoiceRecord | null> {
    return (await prisma.invoice.findUnique({ where: { id: invoiceId } })) as InvoiceRecord | null;
  }

  async markPaid(invoiceId: string, input: { providerPaymentId?: string; providerSignature?: string }): Promise<InvoiceRecord | null> {
    try {
      return (await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          providerPaymentId: input.providerPaymentId,
          providerSignature: input.providerSignature,
          paidAt: new Date()
        }
      })) as InvoiceRecord;
    } catch {
      return null;
    }
  }

  async listByUser(userId: string, input: { page: number; limit: number; type?: InvoiceType }) {
    const filter: Prisma.InvoiceWhereInput = { userId };
    if (input.type) filter.type = input.type;

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({ where: filter, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.invoice.count({ where: filter })
    ]);

    return { data: data as InvoiceRecord[], total };
  }

  async listAll(input: { page: number; limit: number; type?: InvoiceType; status?: InvoiceStatus }) {
    const filter: Prisma.InvoiceWhereInput = {};
    if (input.type) filter.type = input.type;
    if (input.status) filter.status = input.status;

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({ where: filter, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.invoice.count({ where: filter })
    ]);

    return { data: data as InvoiceRecord[], total };
  }
}

export const invoiceRepository = new InvoiceRepository();
