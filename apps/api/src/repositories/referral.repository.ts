import { HydratedDocument, isValidObjectId, Types } from "mongoose";
import { ReferralModel, type ReferralDocument } from "../models/referral.model";
import { ReferralEarningModel, type ReferralEarningDocument } from "../models/referral-earning.model";

type ReferralEntity = HydratedDocument<ReferralDocument>;
type ReferralEarningEntity = HydratedDocument<ReferralEarningDocument>;

const makeCode = (): string => Math.random().toString(36).slice(2, 10).toUpperCase();

export class ReferralRepository {
  async getOrCreateProfile(ownerId: string): Promise<ReferralEntity | null> {
    if (!isValidObjectId(ownerId)) return null;
    const existing = await ReferralModel.findOne({ ownerId }).exec();
    if (existing) return existing;

    for (let i = 0; i < 5; i += 1) {
      try {
        return await ReferralModel.create({
          ownerId,
          code: makeCode(),
          referredUserIds: [],
          totalReferred: 0,
          totalEarnings: 0
        });
      } catch {
        // retry with another code
      }
    }
    return null;
  }

  async findByCode(code: string): Promise<ReferralEntity | null> {
    return ReferralModel.findOne({ code: code.trim().toUpperCase() }).exec();
  }

  async attachReferredUser(code: string, referredUserId: string): Promise<boolean> {
    if (!isValidObjectId(referredUserId)) return false;
    const profile = await this.findByCode(code);
    if (!profile) return false;
    if (String(profile.ownerId) === referredUserId) return false;

    const alreadyLinked = profile.referredUserIds.some((id) => String(id) === referredUserId);
    if (alreadyLinked) return true;

    const hasOtherReferrer = await ReferralModel.exists({ referredUserIds: new Types.ObjectId(referredUserId) });
    if (hasOtherReferrer) return false;

    profile.referredUserIds.push(new Types.ObjectId(referredUserId));
    profile.totalReferred = profile.referredUserIds.length;
    await profile.save();
    return true;
  }

  async findByReferredUser(referredUserId: string): Promise<ReferralEntity | null> {
    if (!isValidObjectId(referredUserId)) return null;
    return ReferralModel.findOne({ referredUserIds: new Types.ObjectId(referredUserId) }).exec();
  }

  async addEarning(input: {
    referrerId: string;
    referredUserId: string;
    invoiceId?: string;
    grossAmount: number;
    ratePercent: number;
  }): Promise<ReferralEarningEntity | null> {
    if (!isValidObjectId(input.referrerId) || !isValidObjectId(input.referredUserId)) return null;
    const amount = Number(((input.grossAmount * input.ratePercent) / 100).toFixed(2));
    if (amount <= 0) return null;

    const row = await ReferralEarningModel.create({
      referrerId: input.referrerId,
      referredUserId: input.referredUserId,
      invoiceId: input.invoiceId,
      amount,
      grossAmount: input.grossAmount,
      ratePercent: input.ratePercent
    });

    await ReferralModel.updateOne(
      { ownerId: input.referrerId },
      { $inc: { totalEarnings: amount } }
    ).exec();

    return row;
  }

  async listEarningsByReferrer(
    referrerId: string,
    input: { page: number; limit: number }
  ): Promise<{ data: ReferralEarningEntity[]; total: number }> {
    if (!isValidObjectId(referrerId)) return { data: [], total: 0 };
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      ReferralEarningModel.find({ referrerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(input.limit)
        .exec(),
      ReferralEarningModel.countDocuments({ referrerId })
    ]);
    return { data, total };
  }
}

export const referralRepository = new ReferralRepository();
