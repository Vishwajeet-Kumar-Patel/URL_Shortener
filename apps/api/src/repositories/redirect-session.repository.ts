import { Types, HydratedDocument } from "mongoose";
import {
  RedirectSessionModel,
  type RedirectSessionDocument,
  type FunnelStepTiming
} from "../models/redirect-session.model";

type RedirectSessionEntity = HydratedDocument<RedirectSessionDocument>;

export class RedirectSessionRepository {
  async createSession(input: {
    shortCode: string;
    anonymousSessionId?: string;
    memberId?: string;
    targetUrl: string;
    ttlMinutes?: number;
    // optional visitor metadata
    ipAddress?: string;
    ipHash?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    deviceType?: string;
    referrer?: string;
    country?: string;
    city?: string;
    jsEnabled?: boolean;
    cookiesEnabled?: boolean;
    // initial raw click log id
    clickLogId?: string;
  }): Promise<RedirectSessionEntity | null> {
    const ttlMs = (input.ttlMinutes || 10) * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    try {
      const session = await RedirectSessionModel.create({
        shortCode: input.shortCode,
        anonymousSessionId: input.anonymousSessionId
          ? new Types.ObjectId(input.anonymousSessionId)
          : undefined,
        memberId: input.memberId ? new Types.ObjectId(input.memberId) : undefined,
        // metadata
        ipAddress: input.ipAddress,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        browser: input.browser,
        os: input.os,
        deviceType: input.deviceType,
        referrer: input.referrer,
        country: input.country,
        city: input.city,
        jsEnabled: input.jsEnabled,
        cookiesEnabled: input.cookiesEnabled,
        clickLogId: input.clickLogId ? new Types.ObjectId(input.clickLogId) : undefined,
        currentStep: 1,
        completedSteps: [],
        expiresAt,
        targetUrl: input.targetUrl,
        stepTimings: [{ step: 1, enteredAt: new Date() }]
      });
      return session;
    } catch {
      return null;
    }
  }

  async findById(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;
    return RedirectSessionModel.findById(new Types.ObjectId(sessionId)).exec();
  }

  async updateStep(
    sessionId: string,
    step: number,
    updates: {
      scrollPosition?: number;
      maxScrollPosition?: number;
      viewportHeight?: number;
      hasScrolledEnough?: boolean;
      ctaClicked?: boolean;
    }
  ): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    const updateData: Record<string, unknown> = {};

    if (updates.scrollPosition !== undefined) updateData.scrollPosition = updates.scrollPosition;
    if (updates.maxScrollPosition !== undefined)
      updateData.maxScrollPosition = updates.maxScrollPosition;
    if (updates.viewportHeight !== undefined) updateData.viewportHeight = updates.viewportHeight;
    if (updates.hasScrolledEnough !== undefined)
      updateData.hasScrolledEnough = updates.hasScrolledEnough;
    if (updates.ctaClicked !== undefined) updateData.ctaClicked = updates.ctaClicked;

    updateData.currentStep = step;

    const session = await RedirectSessionModel.findByIdAndUpdate(
      new Types.ObjectId(sessionId),
      updateData,
      { new: true }
    ).exec();

    return session;
  }

  async addStepTiming(
    sessionId: string,
    step: number,
    timing: FunnelStepTiming
  ): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findByIdAndUpdate(
      new Types.ObjectId(sessionId),
      {
        $push: { stepTimings: timing },
        $addToSet: { completedSteps: step }
      },
      { new: true }
    ).exec();
  }

  async markAsQualified(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findByIdAndUpdate(
      new Types.ObjectId(sessionId),
      { isQualified: true },
      { new: true }
    ).exec();
  }

  async findByShortCodeAndMemberId(
    shortCode: string,
    memberId: string,
    query: { page: number; limit: number }
  ): Promise<{ data: RedirectSessionEntity[]; total: number }> {
    if (!Types.ObjectId.isValid(memberId)) return { data: [], total: 0 };

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      RedirectSessionModel.find({
        shortCode,
        memberId: new Types.ObjectId(memberId)
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .exec(),
      RedirectSessionModel.countDocuments({
        shortCode,
        memberId: new Types.ObjectId(memberId)
      })
    ]);

    return { data, total };
  }

  async countQualifiedByMemberId(memberId: string, since: Date): Promise<number> {
    if (!Types.ObjectId.isValid(memberId)) return 0;
    return RedirectSessionModel.countDocuments({
      memberId: new Types.ObjectId(memberId),
      isQualified: true,
      createdAt: { $gte: since }
    }).exec();
  }

  async countQualifiedByShortCode(shortCode: string, since: Date): Promise<number> {
    return RedirectSessionModel.countDocuments({
      shortCode,
      isQualified: true,
      createdAt: { $gte: since }
    }).exec();
  }
}

export const redirectSessionRepository = new RedirectSessionRepository();
