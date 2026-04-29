import { ClientSession, HydratedDocument, isValidObjectId } from "mongoose";
import { WithdrawalModel, type WithdrawalDocument } from "../models/withdrawal.model";
import type { WithdrawalStatus } from "../types/common";

type WithdrawalEntity = HydratedDocument<WithdrawalDocument>;

export class WithdrawalRepository {
  async createWithdrawal(input: Partial<WithdrawalDocument>, session?: ClientSession): Promise<WithdrawalEntity> {
    if (session) {
      const [created] = await WithdrawalModel.create([input], { session });
      return created;
    }
    return WithdrawalModel.create(input);
  }

  async listByUser(userId: string, input: { page: number; limit: number }): Promise<{ data: WithdrawalEntity[]; total: number }> {
    if (!isValidObjectId(userId)) return { data: [], total: 0 };
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      WithdrawalModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(input.limit).exec(),
      WithdrawalModel.countDocuments({ userId })
    ]);

    return { data, total };
  }

  async listAll(input: { page: number; limit: number; status?: WithdrawalStatus }): Promise<{ data: WithdrawalEntity[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (input.status) filter.status = input.status;

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      WithdrawalModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(input.limit).exec(),
      WithdrawalModel.countDocuments(filter)
    ]);

    return { data, total };
  }

  async updateStatus(
    withdrawalId: string,
    status: WithdrawalStatus,
    update: Record<string, unknown>,
    session?: ClientSession
  ) {
    if (!isValidObjectId(withdrawalId)) return null;
    return WithdrawalModel.findByIdAndUpdate(
      withdrawalId,
      { $set: { status, ...update } },
      { new: true }
    )
      .session(session ?? null)
      .exec();
  }

  async findById(withdrawalId: string, session?: ClientSession) {
    if (!isValidObjectId(withdrawalId)) return null;
    return WithdrawalModel.findById(withdrawalId).session(session ?? null).exec();
  }
}

export const withdrawalRepository = new WithdrawalRepository();
