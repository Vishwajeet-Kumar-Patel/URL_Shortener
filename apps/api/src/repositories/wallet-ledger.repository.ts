import { ClientSession, HydratedDocument, isValidObjectId } from "mongoose";
import { WalletLedgerModel, type WalletLedgerDocument } from "../models/wallet-ledger.model";
import { WALLET_TX_SOURCE } from "../types/common";

type WalletLedgerEntity = HydratedDocument<WalletLedgerDocument>;

export class WalletLedgerRepository {
  async createEntry(input: Partial<WalletLedgerDocument>, session?: ClientSession): Promise<WalletLedgerEntity> {
    if (session) {
      const [created] = await WalletLedgerModel.create([input], { session });
      return created;
    }
    return WalletLedgerModel.create(input);
  }

  async listByUser(userId: string, input: { page: number; limit: number }): Promise<{ data: WalletLedgerEntity[]; total: number }> {
    if (!isValidObjectId(userId)) return { data: [], total: 0 };
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      WalletLedgerModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(input.limit).exec(),
      WalletLedgerModel.countDocuments({ userId })
    ]);

    return { data, total };
  }

  async existsEarningReference(userId: string, referenceId: string): Promise<boolean> {
    if (!isValidObjectId(userId)) return false;
    const existing = await WalletLedgerModel.exists({
      userId,
      source: WALLET_TX_SOURCE.EARNING,
      referenceId
    });
    return Boolean(existing);
  }
}

export const walletLedgerRepository = new WalletLedgerRepository();
