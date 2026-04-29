import { ClientSession, HydratedDocument, isValidObjectId } from "mongoose";
import { WalletModel, type WalletDocument } from "../models/wallet.model";

type WalletEntity = HydratedDocument<WalletDocument>;

export class WalletRepository {
  async getOrCreateWallet(userId: string, session?: ClientSession): Promise<WalletEntity> {
    if (!isValidObjectId(userId)) {
      throw new Error("Invalid user id");
    }

    const existing = await WalletModel.findOne({ userId }).session(session ?? null).exec();
    if (existing) return existing;

    if (session) {
      const [created] = await WalletModel.create(
        [{ userId, balance: 0, pendingAmount: 0, lastUpdatedAt: new Date() }],
        { session }
      );
      return created;
    }
    return WalletModel.create({ userId, balance: 0, pendingAmount: 0, lastUpdatedAt: new Date() });
  }

  async updateBalances(
    userId: string,
    input: { balance: number; pendingAmount: number },
    session?: ClientSession
  ): Promise<WalletEntity | null> {
    if (!isValidObjectId(userId)) return null;
    return WalletModel.findOneAndUpdate(
      { userId },
      { $set: { balance: input.balance, pendingAmount: input.pendingAmount, lastUpdatedAt: new Date() } },
      { new: true }
    )
      .session(session ?? null)
      .exec();
  }

  async incrementBalances(
    userId: string,
    input: { balanceDelta?: number; pendingDelta?: number },
    session?: ClientSession
  ): Promise<WalletEntity | null> {
    if (!isValidObjectId(userId)) return null;
    return WalletModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId, balance: 0, pendingAmount: 0 },
        $inc: {
          balance: input.balanceDelta ?? 0,
          pendingAmount: input.pendingDelta ?? 0
        },
        $set: { lastUpdatedAt: new Date() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .session(session ?? null)
      .exec();
  }
}

export const walletRepository = new WalletRepository();
