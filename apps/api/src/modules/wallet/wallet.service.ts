import { StatusCodes } from "http-status-codes";
import { ClientSession, startSession } from "mongoose";
import { walletRepository } from "../../repositories/wallet.repository";
import { walletLedgerRepository } from "../../repositories/wallet-ledger.repository";
import { WALLET_TX_SOURCE, WALLET_TX_TYPE, type WalletTxSource } from "../../types/common";
import type { WalletLedgerItem, WalletLedgerQuery, WalletSummary } from "./wallet.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class WalletService {
  async getSummary(userId: string): Promise<WalletSummary> {
    const wallet = await walletRepository.getOrCreateWallet(userId);
    return { balance: wallet.balance, pendingAmount: wallet.pendingAmount };
  }

  async listLedger(userId: string, query: WalletLedgerQuery): Promise<{
    items: WalletLedgerItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await walletLedgerRepository.listByUser(userId, query);
    return {
      items: data.map((entry) => ({
        id: entry.id,
        type: entry.type,
        source: entry.source,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        referenceId: entry.referenceId,
        memo: entry.memo,
        createdAt: entry.createdAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async credit(
    userId: string,
    amount: number,
    source: WalletTxSource = WALLET_TX_SOURCE.ADJUSTMENT,
    referenceId?: string,
    memo?: string,
    session?: ClientSession
  ): Promise<void> {
    if (amount <= 0) {
      throw buildServiceError("Amount must be greater than zero", StatusCodes.BAD_REQUEST);
    }

    if (source === WALLET_TX_SOURCE.EARNING && referenceId) {
      const exists = await walletLedgerRepository.existsEarningReference(userId, referenceId);
      if (exists) {
        return;
      }
    }

    const updated = await walletRepository.incrementBalances(userId, { balanceDelta: amount }, session);
    if (!updated) {
      throw buildServiceError("Wallet not found", StatusCodes.NOT_FOUND);
    }

    try {
      await walletLedgerRepository.createEntry({
        userId: updated.userId,
        type: WALLET_TX_TYPE.CREDIT,
        source,
        amount,
        balanceAfter: updated.balance,
        referenceId,
        memo
      }, session);
    } catch (error) {
      // duplicate earning reference can happen under concurrency; rollback balance and ignore
      const duplicateKey = (error as { code?: number })?.code === 11000;
      if (duplicateKey && source === WALLET_TX_SOURCE.EARNING && referenceId) {
        await walletRepository.incrementBalances(userId, { balanceDelta: -amount }, session);
        return;
      }
      throw error;
    }
  }

  async debit(
    userId: string,
    amount: number,
    source: WalletTxSource = WALLET_TX_SOURCE.ADJUSTMENT,
    referenceId?: string,
    memo?: string,
    session?: ClientSession
  ): Promise<void> {
    if (amount <= 0) {
      throw buildServiceError("Amount must be greater than zero", StatusCodes.BAD_REQUEST);
    }

    const wallet = await walletRepository.getOrCreateWallet(userId, session);
    if (wallet.balance < amount) {
      throw buildServiceError("Insufficient wallet balance", StatusCodes.BAD_REQUEST);
    }

    const nextBalance = wallet.balance - amount;

    await walletRepository.updateBalances(userId, {
      balance: nextBalance,
      pendingAmount: wallet.pendingAmount
    }, session);

    await walletLedgerRepository.createEntry({
      userId: wallet.userId,
      type: WALLET_TX_TYPE.DEBIT,
      source,
      amount,
      balanceAfter: nextBalance,
      referenceId,
      memo
    }, session);
  }

  async moveToPending(userId: string, amount: number, referenceId?: string, session?: ClientSession): Promise<void> {
    if (amount <= 0) {
      throw buildServiceError("Amount must be greater than zero", StatusCodes.BAD_REQUEST);
    }

    const wallet = await walletRepository.getOrCreateWallet(userId, session);
    const nextBalance = wallet.balance;
    const nextPending = wallet.pendingAmount + amount;

    await walletRepository.updateBalances(userId, {
      balance: nextBalance,
      pendingAmount: nextPending
    }, session);

    await walletLedgerRepository.createEntry({
      userId: wallet.userId,
      type: WALLET_TX_TYPE.DEBIT,
      source: WALLET_TX_SOURCE.WITHDRAWAL,
      amount,
      balanceAfter: nextBalance,
      referenceId,
      memo: "Withdrawal requested"
    }, session);
  }

  async releasePending(userId: string, amount: number, referenceId?: string, session?: ClientSession): Promise<void> {
    const wallet = await walletRepository.getOrCreateWallet(userId, session);
    if (wallet.pendingAmount < amount) {
      throw buildServiceError("Insufficient pending withdrawal balance", StatusCodes.BAD_REQUEST);
    }

    if (wallet.balance < amount) {
      throw buildServiceError("Insufficient wallet balance", StatusCodes.BAD_REQUEST);
    }

    const nextBalance = wallet.balance - amount;
    const nextPending = wallet.pendingAmount - amount;

    await walletRepository.updateBalances(userId, {
      balance: nextBalance,
      pendingAmount: nextPending
    }, session);

    await walletLedgerRepository.createEntry({
      userId: wallet.userId,
      type: WALLET_TX_TYPE.DEBIT,
      source: WALLET_TX_SOURCE.WITHDRAWAL,
      amount,
      balanceAfter: nextBalance,
      referenceId,
      memo: "Withdrawal processed"
    }, session);
  }

  async refundPending(userId: string, amount: number, referenceId?: string, session?: ClientSession): Promise<void> {
    const wallet = await walletRepository.getOrCreateWallet(userId, session);
    if (wallet.pendingAmount < amount) {
      throw buildServiceError("Insufficient pending withdrawal balance", StatusCodes.BAD_REQUEST);
    }

    const nextBalance = wallet.balance;
    const nextPending = wallet.pendingAmount - amount;

    await walletRepository.updateBalances(userId, {
      balance: nextBalance,
      pendingAmount: nextPending
    }, session);

    await walletLedgerRepository.createEntry({
      userId: wallet.userId,
      type: WALLET_TX_TYPE.CREDIT,
      source: WALLET_TX_SOURCE.ADJUSTMENT,
      amount: 0,
      balanceAfter: nextBalance,
      referenceId,
      memo: "Withdrawal rejected"
    }, session);
  }

  async requestWithdrawalAtomic(userId: string, amount: number): Promise<void> {
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        await this.moveToPending(userId, amount, undefined, session);
      });
    } finally {
      await session.endSession();
    }
  }
}

export const walletService = new WalletService();
