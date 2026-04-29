import { HydratedDocument, isValidObjectId } from "mongoose";
import { PaymentTransactionModel, type PaymentTransactionDocument } from "../models/payment-transaction.model";
import type { PaymentProvider } from "../types/common";

type PaymentTransactionEntity = HydratedDocument<PaymentTransactionDocument>;

export class PaymentTransactionRepository {
  async createTransaction(input: {
    invoiceId?: string;
    provider: PaymentProvider;
    eventType: string;
    payload: Record<string, unknown>;
    signature?: string;
    receivedAt?: Date;
  }): Promise<PaymentTransactionEntity> {
    return PaymentTransactionModel.create({
      invoiceId: input.invoiceId,
      provider: input.provider,
      eventType: input.eventType,
      payload: input.payload,
      signature: input.signature,
      receivedAt: input.receivedAt ?? new Date()
    });
  }

  async listByInvoice(invoiceId: string): Promise<PaymentTransactionEntity[]> {
    if (!isValidObjectId(invoiceId)) return [];
    return PaymentTransactionModel.find({ invoiceId }).sort({ createdAt: -1 }).exec();
  }

  async listAll(input: { page: number; limit: number; provider?: PaymentProvider }): Promise<{ data: PaymentTransactionEntity[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (input.provider) {
      filter.provider = input.provider;
    }
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      PaymentTransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(input.limit).exec(),
      PaymentTransactionModel.countDocuments(filter)
    ]);
    return { data, total };
  }
}

export const paymentTransactionRepository = new PaymentTransactionRepository();
