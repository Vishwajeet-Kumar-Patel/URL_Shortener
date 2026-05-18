import { StatusCodes } from "http-status-codes";
import { prisma } from "../../config/prisma";
import { withdrawalRepository } from "../../repositories/withdrawal.repository";
import { walletService } from "../wallet/wallet.service";
import { WITHDRAWAL_STATUS } from "../../types/common";
import type { CreateWithdrawalInput, ListWithdrawalsQuery, WithdrawalListItem } from "./withdrawal.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class WithdrawalService {
  async requestWithdrawal(userId: string, input: CreateWithdrawalInput): Promise<WithdrawalListItem> {
    let created: Awaited<ReturnType<typeof withdrawalRepository.createWithdrawal>> | null = null;
    await prisma.$transaction(async (tx) => {
      await walletService.moveToPending(userId, input.amount, undefined, tx as any);

      created = await withdrawalRepository.createWithdrawal(
        {
          userId,
          amount: input.amount,
          status: WITHDRAWAL_STATUS.PENDING,
          payoutMethod: input.payoutMethod,
          payoutAccount: input.payoutAccount,
          memo: input.memo
        },
        tx as any
      );
    });
    if (!created) {
      throw buildServiceError("Unable to request withdrawal", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return this.toItem(created);
  }

  async listMyWithdrawals(userId: string, query: ListWithdrawalsQuery): Promise<{
    items: WithdrawalListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await withdrawalRepository.listByUser(userId, query);
    return {
      items: data.map((row) => this.toItem(row)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async listAllWithdrawals(query: ListWithdrawalsQuery): Promise<{
    items: WithdrawalListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await withdrawalRepository.listAll(query);
    return {
      items: data.map((row) => this.toItem(row)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async updateStatus(withdrawalId: string, status: string, memo?: string): Promise<WithdrawalListItem> {
    let updated: Awaited<ReturnType<typeof withdrawalRepository.findById>> | null = null;
    await prisma.$transaction(async (tx) => {
      const existing = await withdrawalRepository.findById(withdrawalId, tx as any);
      if (!existing) {
        throw buildServiceError("Withdrawal not found", StatusCodes.NOT_FOUND);
      }

      if (status === WITHDRAWAL_STATUS.REJECTED) {
        await walletService.refundPending(String(existing.userId), existing.amount, withdrawalId, tx as any);
        updated = await withdrawalRepository.updateStatus(
          withdrawalId,
          WITHDRAWAL_STATUS.REJECTED,
          {
            rejectedAt: new Date(),
            memo
          },
          tx as any
        );
        if (!updated) throw buildServiceError("Unable to update withdrawal", StatusCodes.INTERNAL_SERVER_ERROR);
        return;
      }

      if (status === WITHDRAWAL_STATUS.APPROVED) {
        await walletService.releasePending(String(existing.userId), existing.amount, withdrawalId, tx as any);
        updated = await withdrawalRepository.updateStatus(
          withdrawalId,
          WITHDRAWAL_STATUS.APPROVED,
          {
            approvedAt: new Date(),
            memo
          },
          tx as any
        );
        if (!updated) throw buildServiceError("Unable to update withdrawal", StatusCodes.INTERNAL_SERVER_ERROR);
        return;
      }

      if (status === WITHDRAWAL_STATUS.PAID) {
        updated = await withdrawalRepository.updateStatus(
          withdrawalId,
          WITHDRAWAL_STATUS.PAID,
          {
            processedAt: new Date(),
            memo
          },
          tx as any
        );
        if (!updated) throw buildServiceError("Unable to update withdrawal", StatusCodes.INTERNAL_SERVER_ERROR);
        return;
      }

      throw buildServiceError("Unsupported withdrawal status", StatusCodes.BAD_REQUEST);
    });

    if (!updated) {
      throw buildServiceError("Unable to update withdrawal", StatusCodes.INTERNAL_SERVER_ERROR);
    }
    return this.toItem(updated);
  }

  private toItem(row: Awaited<ReturnType<typeof withdrawalRepository.findById>>): WithdrawalListItem {
    if (!row) {
      throw buildServiceError("Withdrawal not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: row.id,
      amount: row.amount,
      status: row.status,
      payoutMethod: row.payoutMethod ?? undefined,
      payoutAccount: row.payoutAccount ?? undefined,
      memo: row.memo ?? undefined,
      createdAt: row.createdAt,
      approvedAt: row.approvedAt ?? undefined,
      rejectedAt: row.rejectedAt ?? undefined,
      processedAt: row.processedAt ?? undefined
    };
  }
}

export const withdrawalService = new WithdrawalService();
