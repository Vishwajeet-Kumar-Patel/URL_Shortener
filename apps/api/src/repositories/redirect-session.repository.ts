import { Types, HydratedDocument } from "mongoose";
import {
  RedirectSessionModel,
  PUBLIC_FUNNEL_STATE,
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
    fingerprintHash?: string;
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
        fingerprintHash: input.fingerprintHash,
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
        currentStep: 0,
        completedSteps: [],
        startedAt: new Date(),
        humanVerified: false,
        currentState: PUBLIC_FUNNEL_STATE.HUMAN_PENDING,
        expiresAt,
        targetUrl: input.targetUrl,
        stepTimings: []
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
      {
        $set: updateData
      },
      { new: true }
    ).exec();

    return session;
  }

  async addStepTiming(
    sessionId: string,
    _step: number,
    timing: FunnelStepTiming
  ): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findByIdAndUpdate(
      new Types.ObjectId(sessionId),
      {
        $push: { stepTimings: timing }
      },
      { new: true }
    ).exec();
  }

  async markAsQualified(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findByIdAndUpdate(
      new Types.ObjectId(sessionId),
      { isQualified: true, completedAt: new Date() },
      { new: true }
    ).exec();
  }

  async markSponsorClicked(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findByIdAndUpdate(
      new Types.ObjectId(sessionId),
      {
        sponsorOpenedAt: new Date(),
        sponsorClickedAt: new Date(),
        currentState: PUBLIC_FUNNEL_STATE.SPONSOR_PENDING,
        currentStep: 4
      },
      { new: true }
    ).exec();
  }

  async verifyHuman(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        humanVerified: { $ne: true },
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          humanVerified: true,
          currentState: PUBLIC_FUNNEL_STATE.HUMAN_VERIFIED,
          currentStep: 1
        }
      },
      { new: true }
    ).exec();
  }

  async startPhase1(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        humanVerified: true,
        phase1StartedAt: { $exists: false },
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          phase1StartedAt: new Date(),
          currentState: PUBLIC_FUNNEL_STATE.PHASE1_ACTIVE,
          currentStep: 1
        }
      },
      { new: true }
    ).exec();
  }

  async completePhase1(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        phase1StartedAt: { $exists: true },
        phase1CompletedAt: { $exists: false },
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          phase1CompletedAt: new Date(),
          currentState: PUBLIC_FUNNEL_STATE.PHASE1_COMPLETED,
          currentStep: 2
        }
      },
      { new: true }
    ).exec();
  }

  async startPhase2(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        phase1CompletedAt: { $exists: true },
        phase2StartedAt: { $exists: false },
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          phase2StartedAt: new Date(),
          currentState: PUBLIC_FUNNEL_STATE.PHASE2_ACTIVE,
          currentStep: 2
        }
      },
      { new: true }
    ).exec();
  }

  async completePhase2(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        phase2StartedAt: { $exists: true },
        phase2CompletedAt: { $exists: false },
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          phase2CompletedAt: new Date(),
          currentState: PUBLIC_FUNNEL_STATE.PHASE2_COMPLETED,
          currentStep: 3
        }
      },
      { new: true }
    ).exec();
  }

  async markSponsorOpened(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        phase2CompletedAt: { $exists: true },
        sponsorOpenedAt: { $exists: false },
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          sponsorOpenedAt: new Date(),
          currentState: PUBLIC_FUNNEL_STATE.SPONSOR_PENDING,
          currentStep: 4
        }
      },
      { new: true }
    ).exec();
  }

  async markSponsorVerified(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        sponsorOpenedAt: { $exists: true },
        sponsorVerifiedAt: { $exists: false },
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          sponsorVerifiedAt: new Date(),
          sponsorClickedAt: new Date(),
          currentState: PUBLIC_FUNNEL_STATE.SPONSOR_VERIFIED,
          currentStep: 4
        }
      },
      { new: true }
    ).exec();
  }

  async markUnlocked(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    return RedirectSessionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        finalUnlockedAt: { $exists: false }
      },
      {
        $set: {
          finalUnlockedAt: new Date(),
          completedAt: new Date(),
          isQualified: true,
          currentState: PUBLIC_FUNNEL_STATE.UNLOCKED,
          currentStep: 5
        }
      },
      { new: true }
    ).exec();
  }

  async updateStageTimestamp(
    sessionId: string,
    stage: 1 | 2 | 3 | 4 | 5
  ): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    const timestampFieldMap = {
      1: "step1CompleteAt",
      2: "step2CompleteAt",
      3: "step3CompleteAt",
      4: "step4CompleteAt",
      5: "step5CompleteAt"
    } as const;

    return RedirectSessionModel.findByIdAndUpdate(
      new Types.ObjectId(sessionId),
      {
        $set: {
          [timestampFieldMap[stage]]: new Date(),
          currentStep: stage
        }
      },
      { new: true }
    ).exec();
  }

  async markStepComplete(
    sessionId: string,
    step: 1 | 2 | 3 | 4
  ): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    const timestampFieldMap = {
      1: "step1CompleteAt",
      2: "step2CompleteAt",
      3: "step3CompleteAt",
      4: "step4CompleteAt"
    } as const;

    const sessionObjectId = new Types.ObjectId(sessionId);
    const timestampField = timestampFieldMap[step];
    const timestampValue = new Date();

    const updatedSession = await RedirectSessionModel.findOneAndUpdate(
      {
        _id: sessionObjectId,
        [timestampField]: { $exists: false }
      },
      {
        $set: {
          [timestampField]: timestampValue,
          currentStep: Math.min(step + 1, 5)
        },
        $addToSet: { completedSteps: step }
      },
      { new: true }
    ).exec();

    if (updatedSession) {
      return updatedSession;
    }

    return RedirectSessionModel.findById(sessionObjectId).exec();
  }

  async markCompleted(sessionId: string): Promise<RedirectSessionEntity | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;

    const updatedSession = await this.markUnlocked(sessionId);
    if (updatedSession) {
      return updatedSession;
    }

    return RedirectSessionModel.findById(new Types.ObjectId(sessionId)).exec();
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
