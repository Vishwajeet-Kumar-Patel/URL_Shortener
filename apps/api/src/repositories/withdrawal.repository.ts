import { prisma } from "../config/prisma";
import type { Prisma, Withdrawal } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class WithdrawalRepository {
  async createWithdrawal(input: Partial<Withdrawal>, tx?: Tx): Promise<Withdrawal> {
    const db = tx ?? prisma;
    return db.withdrawal.create({ data: input as any });
  }

  async listByUser(userId: string, input: { page: number; limit: number }): Promise<{ data: Withdrawal[]; total: number }> {
    if (!userId) return { data: [], total: 0 };
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.withdrawal.count({ where: { userId } })
    ]);
    return { data, total };
  }

  async listAll(input: { page: number; limit: number; status?: string }): Promise<{ data: Withdrawal[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (input.status) (where as any).status = input.status;
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.withdrawal.findMany({ where: where as any, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.withdrawal.count({ where: where as any })
    ]);
    return { data, total };
  }

  async updateStatus(
    withdrawalId: string,
    status: string,
    update: Record<string, unknown>,
    tx?: Tx
  ) {
    const db = tx ?? prisma;
    return db.withdrawal.update({ where: { id: withdrawalId }, data: { status, ...update } as any });
  }

  async findById(withdrawalId: string, tx?: Tx) {
    const db = tx ?? prisma;
    return db.withdrawal.findUnique({ where: { id: withdrawalId } });
  }
}

export const withdrawalRepository = new WithdrawalRepository();
