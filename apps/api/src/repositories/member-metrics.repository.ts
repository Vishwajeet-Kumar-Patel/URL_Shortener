import { Types, HydratedDocument } from "mongoose";
import { MemberMetricsModel, type MemberMetricsDocument } from "../models/member-metrics.model";

type MemberMetricsEntity = HydratedDocument<MemberMetricsDocument>;

export class MemberMetricsRepository {
  async getOrCreateMetrics(memberId: string): Promise<MemberMetricsEntity | null> {
    if (!Types.ObjectId.isValid(memberId)) return null;

    const objId = new Types.ObjectId(memberId);
    const existing = await MemberMetricsModel.findOne({ memberId: objId }).exec();

    if (existing) return existing;

    try {
      return await MemberMetricsModel.create({
        memberId: objId,
        totalAnonymousUsersBrought: 0,
        totalAnonymousLinksGenerated: 0,
        totalQualifiedClicks: 0,
        totalEarnings: 0,
        thisMonthEarnings: 0,
        thisMonthUsers: 0
      });
    } catch {
      return null;
    }
  }

  async incrementUsersBrought(memberId: string, count: number = 1): Promise<boolean> {
    if (!Types.ObjectId.isValid(memberId)) return false;

    const result = await MemberMetricsModel.updateOne(
      { memberId: new Types.ObjectId(memberId) },
      {
        $inc: {
          totalAnonymousUsersBrought: count,
          thisMonthUsers: count
        }
      }
    ).exec();

    return result.modifiedCount > 0;
  }

  async incrementLinksGenerated(memberId: string, count: number = 1): Promise<boolean> {
    if (!Types.ObjectId.isValid(memberId)) return false;

    const result = await MemberMetricsModel.updateOne(
      { memberId: new Types.ObjectId(memberId) },
      {
        $inc: {
          totalAnonymousLinksGenerated: count
        }
      }
    ).exec();

    return result.modifiedCount > 0;
  }

  async incrementQualifiedClicks(memberId: string, count: number = 1): Promise<boolean> {
    if (!Types.ObjectId.isValid(memberId)) return false;

    const result = await MemberMetricsModel.updateOne(
      { memberId: new Types.ObjectId(memberId) },
      {
        $inc: {
          totalQualifiedClicks: count
        }
      }
    ).exec();

    return result.modifiedCount > 0;
  }

  async addEarnings(memberId: string, amount: number, isThisMonth: boolean = true): Promise<boolean> {
    if (!Types.ObjectId.isValid(memberId)) return false;

    const update: Record<string, unknown> = {
      $inc: {
        totalEarnings: amount
      }
    };

    if (isThisMonth) {
      update.$inc = { ...(update.$inc || {}), thisMonthEarnings: amount };
    }

    const result = await MemberMetricsModel.updateOne(
      { memberId: new Types.ObjectId(memberId) },
      update
    ).exec();

    return result.modifiedCount > 0;
  }

  async updateCalculatedAt(memberId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(memberId)) return false;

    const result = await MemberMetricsModel.updateOne(
      { memberId: new Types.ObjectId(memberId) },
      { lastCalculatedAt: new Date() }
    ).exec();

    return result.modifiedCount > 0;
  }

  async findByMemberId(memberId: string): Promise<MemberMetricsEntity | null> {
    if (!Types.ObjectId.isValid(memberId)) return null;
    return MemberMetricsModel.findOne({ memberId: new Types.ObjectId(memberId) }).exec();
  }

  async getTopEarners(limit: number = 10): Promise<MemberMetricsEntity[]> {
    return MemberMetricsModel.find()
      .sort({ totalEarnings: -1 })
      .limit(limit)
      .exec();
  }

  async getTopThisMonth(limit: number = 10): Promise<MemberMetricsEntity[]> {
    return MemberMetricsModel.find()
      .sort({ thisMonthEarnings: -1 })
      .limit(limit)
      .exec();
  }

  async resetMonthlyMetrics(): Promise<void> {
    await MemberMetricsModel.updateMany(
      {},
      {
        thisMonthEarnings: 0,
        thisMonthUsers: 0
      }
    ).exec();
  }
}

export const memberMetricsRepository = new MemberMetricsRepository();
