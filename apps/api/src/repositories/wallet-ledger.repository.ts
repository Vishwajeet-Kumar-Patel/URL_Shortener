import { prisma } from "../config/prisma";
import type { Prisma, WalletLedger } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class WalletLedgerRepository {
  async createEntry(input: Partial<WalletLedger>, tx?: Tx): Promise<WalletLedger> {
    const db = tx ?? prisma;
    return db.walletLedger.create({ data: { ...input } as any });
  }

  async listByUser(userId: string, input: { page: number; limit: number }): Promise<{ data: WalletLedger[]; total: number }> {
    if (!userId) return { data: [], total: 0 };
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.walletLedger.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.walletLedger.count({ where: { userId } })
    ]);

    return { data, total };
  }

  async existsEarningReference(userId: string, referenceId: string): Promise<boolean> {
    if (!userId) return false;
    const existing = await prisma.walletLedger.findFirst({ where: { userId, source: "EARNING", referenceId } });
    return Boolean(existing);
  }
}

export const walletLedgerRepository = new WalletLedgerRepository();
