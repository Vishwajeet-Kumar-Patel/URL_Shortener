import { prisma } from "../config/prisma";
import type { Prisma, Wallet } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class WalletRepository {
  async getOrCreateWallet(userId: string, tx?: Tx): Promise<Wallet> {
    if (!userId) throw new Error("Invalid user id");
    const db = tx ?? prisma;
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return existing;

    return db.wallet.create({ data: { userId, balance: 0, pendingAmount: 0, lastUpdatedAt: new Date() } });
  }

  async updateBalances(
    userId: string,
    input: { balance: number; pendingAmount: number },
    tx?: Tx
  ): Promise<Wallet | null> {
    const db = tx ?? prisma;
    try {
      return await db.wallet.update({
        where: { userId },
        data: { balance: input.balance, pendingAmount: input.pendingAmount, lastUpdatedAt: new Date() }
      });
    } catch {
      return null;
    }
  }

  async incrementBalances(
    userId: string,
    input: { balanceDelta?: number; pendingDelta?: number },
    tx?: Tx
  ): Promise<Wallet | null> {
    const db = tx ?? prisma;
    const balanceDelta = input.balanceDelta ?? 0;
    const pendingDelta = input.pendingDelta ?? 0;
    // upsert with increment
    const upsert = await db.wallet.upsert({
      where: { userId },
      update: {
        balance: { increment: balanceDelta },
        pendingAmount: { increment: pendingDelta },
        lastUpdatedAt: new Date()
      },
      create: { userId, balance: balanceDelta, pendingAmount: pendingDelta, lastUpdatedAt: new Date() }
    });
    return upsert;
  }
}

export const walletRepository = new WalletRepository();
