import { Types, HydratedDocument } from "mongoose";
import { AnonymousSessionModel, type AnonymousSessionDocument } from "../models/anonymous-session.model";

type AnonymousSessionEntity = HydratedDocument<AnonymousSessionDocument>;

export class AnonymousSessionRepository {
  async createSession(input: {
    sessionToken: string;
    userAgent: string;
    ipHash: string;
    referralCode?: string;
    memberId?: string;
    ttlMinutes?: number;
  }): Promise<AnonymousSessionEntity | null> {
    const ttlMs = (input.ttlMinutes || 30) * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    try {
      const session = await AnonymousSessionModel.create({
        sessionToken: input.sessionToken,
        userAgent: input.userAgent,
        ipHash: input.ipHash,
        referralCode: input.referralCode,
        memberId: input.memberId ? new Types.ObjectId(input.memberId) : undefined,
        isValid: true,
        expiresAt
      });
      return session;
    } catch {
      return null;
    }
  }

  async findByToken(sessionToken: string): Promise<AnonymousSessionEntity | null> {
    return AnonymousSessionModel.findOne({ sessionToken, isValid: true }).exec();
  }

  async invalidateSession(sessionToken: string): Promise<boolean> {
    const result = await AnonymousSessionModel.updateOne(
      { sessionToken },
      { isValid: false }
    ).exec();
    return result.modifiedCount > 0;
  }

  async findByMemberId(
    memberId: string,
    query: { page: number; limit: number }
  ): Promise<{ data: AnonymousSessionEntity[]; total: number }> {
    if (!this.isValidObjectId(memberId)) return { data: [], total: 0 };

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      AnonymousSessionModel.find({ memberId: new Types.ObjectId(memberId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .exec(),
      AnonymousSessionModel.countDocuments({ memberId: new Types.ObjectId(memberId) })
    ]);

    return { data, total };
  }

  async countByMemberIdSince(memberId: string, since: Date): Promise<number> {
    if (!this.isValidObjectId(memberId)) return 0;
    return AnonymousSessionModel.countDocuments({
      memberId: new Types.ObjectId(memberId),
      createdAt: { $gte: since }
    }).exec();
  }

  async countUniqueByIpHashSince(ipHash: string, since: Date): Promise<number> {
    const sessions = await AnonymousSessionModel.find({
      ipHash,
      createdAt: { $gte: since }
    })
      .select("sessionToken")
      .exec();
    return new Set(sessions.map((s) => s.ipHash)).size;
  }

  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }
}

export const anonymousSessionRepository = new AnonymousSessionRepository();
