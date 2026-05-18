import { prisma } from "../config/prisma";

export const PUBLIC_FUNNEL_STATE = {
  HUMAN_PENDING: "HUMAN_PENDING",
  HUMAN_VERIFIED: "HUMAN_VERIFIED",
  PHASE1_ACTIVE: "PHASE1_ACTIVE",
  PHASE1_COMPLETED: "PHASE1_COMPLETED",
  PHASE2_ACTIVE: "PHASE2_ACTIVE",
  PHASE2_COMPLETED: "PHASE2_COMPLETED",
  SPONSOR_PENDING: "SPONSOR_PENDING",
  SPONSOR_VERIFIED: "SPONSOR_VERIFIED",
  UNLOCKED: "UNLOCKED"
} as const;

export type FunnelStepTiming = {
  step: number;
  enteredAt: Date;
  validatedAt?: Date;
};

export type RedirectSessionRecord = {
  id: string;
  shortCode: string;
  anonymousSessionId: string | null;
  ipAddress: string | null;
  ipHash: string | null;
  fingerprintHash: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  jsEnabled: boolean;
  cookiesEnabled: boolean;
  startedAt: Date;
  humanVerified: boolean;
  phase1StartedAt: Date | null;
  phase1CompletedAt: Date | null;
  phase2StartedAt: Date | null;
  phase2CompletedAt: Date | null;
  sponsorOpenedAt: Date | null;
  sponsorVerifiedAt: Date | null;
  finalUnlockedAt: Date | null;
  currentState: string;
  sponsorClickedAt: Date | null;
  completedAt: Date | null;
  clickLogId: string | null;
  memberId: string | null;
  currentStep: number;
  completedSteps: number[];
  step1CompleteAt: Date | null;
  step2CompleteAt: Date | null;
  step3CompleteAt: Date | null;
  step4CompleteAt: Date | null;
  step5CompleteAt: Date | null;
  scrollPosition: number;
  maxScrollPosition: number;
  viewportHeight: number;
  hasScrolledEnough: boolean;
  ctaClicked: boolean;
  expiresAt: Date;
  stepTimings: FunnelStepTiming[] | unknown;
  isQualified: boolean;
  targetUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

const toRecord = (row: unknown): RedirectSessionRecord => row as RedirectSessionRecord;

export class RedirectSessionRepository {
  async createSession(input: {
    shortCode: string;
    anonymousSessionId?: string;
    memberId?: string;
    targetUrl: string;
    ttlMinutes?: number;
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
    clickLogId?: string;
  }): Promise<RedirectSessionRecord | null> {
    const ttlMs = (input.ttlMinutes || 10) * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    try {
      const session = await prisma.redirectSession.create({
        data: {
          shortCode: input.shortCode,
          anonymousSessionId: input.anonymousSessionId,
          memberId: input.memberId,
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
          jsEnabled: input.jsEnabled ?? true,
          cookiesEnabled: input.cookiesEnabled ?? true,
          clickLogId: input.clickLogId,
          currentStep: 0,
          completedSteps: [],
          startedAt: new Date(),
          humanVerified: false,
          currentState: PUBLIC_FUNNEL_STATE.HUMAN_PENDING,
          expiresAt,
          targetUrl: input.targetUrl,
          stepTimings: []
        }
      });
      return toRecord(session);
    } catch {
      return null;
    }
  }

  async findById(sessionId: string): Promise<RedirectSessionRecord | null> {
    return (await prisma.redirectSession.findUnique({ where: { id: sessionId } })) as RedirectSessionRecord | null;
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
  ): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current) return null;

    const data: Record<string, unknown> = { currentStep: step };
    if (updates.scrollPosition !== undefined) data.scrollPosition = updates.scrollPosition;
    if (updates.maxScrollPosition !== undefined) data.maxScrollPosition = updates.maxScrollPosition;
    if (updates.viewportHeight !== undefined) data.viewportHeight = updates.viewportHeight;
    if (updates.hasScrolledEnough !== undefined) data.hasScrolledEnough = updates.hasScrolledEnough;
    if (updates.ctaClicked !== undefined) data.ctaClicked = updates.ctaClicked;

    return (await prisma.redirectSession.update({ where: { id: sessionId }, data: data as never })) as RedirectSessionRecord;
  }

  async addStepTiming(sessionId: string, _step: number, timing: FunnelStepTiming): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current) return null;
    const existing = Array.isArray(current.stepTimings) ? current.stepTimings : [];
    const stepTimings = [...existing, timing];
    return (await prisma.redirectSession.update({ where: { id: sessionId }, data: { stepTimings } as never })) as RedirectSessionRecord;
  }

  async markAsQualified(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { isQualified: true, completedAt: new Date() }
    })) as RedirectSessionRecord;
  }

  async markSponsorClicked(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: {
        sponsorOpenedAt: new Date(),
        sponsorClickedAt: new Date(),
        currentState: PUBLIC_FUNNEL_STATE.SPONSOR_PENDING,
        currentStep: 4
      }
    })) as RedirectSessionRecord;
  }

  async verifyHuman(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || current.humanVerified || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { humanVerified: true, currentState: PUBLIC_FUNNEL_STATE.HUMAN_VERIFIED, currentStep: 1 }
    })) as RedirectSessionRecord;
  }

  async startPhase1(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || !current.humanVerified || current.phase1StartedAt || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { phase1StartedAt: new Date(), currentState: PUBLIC_FUNNEL_STATE.PHASE1_ACTIVE, currentStep: 1 }
    })) as RedirectSessionRecord;
  }

  async completePhase1(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || !current.phase1StartedAt || current.phase1CompletedAt || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { phase1CompletedAt: new Date(), currentState: PUBLIC_FUNNEL_STATE.PHASE1_COMPLETED, currentStep: 2 }
    })) as RedirectSessionRecord;
  }

  async startPhase2(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || !current.phase1CompletedAt || current.phase2StartedAt || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { phase2StartedAt: new Date(), currentState: PUBLIC_FUNNEL_STATE.PHASE2_ACTIVE, currentStep: 2 }
    })) as RedirectSessionRecord;
  }

  async completePhase2(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || !current.phase2StartedAt || current.phase2CompletedAt || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { phase2CompletedAt: new Date(), currentState: PUBLIC_FUNNEL_STATE.PHASE2_COMPLETED, currentStep: 3 }
    })) as RedirectSessionRecord;
  }

  async markSponsorOpened(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || !current.phase2CompletedAt || current.sponsorOpenedAt || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { sponsorOpenedAt: new Date(), currentState: PUBLIC_FUNNEL_STATE.SPONSOR_PENDING, currentStep: 4 }
    })) as RedirectSessionRecord;
  }

  async markSponsorVerified(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || !current.sponsorOpenedAt || current.sponsorVerifiedAt || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: {
        sponsorVerifiedAt: new Date(),
        sponsorClickedAt: new Date(),
        currentState: PUBLIC_FUNNEL_STATE.SPONSOR_VERIFIED,
        currentStep: 4
      }
    })) as RedirectSessionRecord;
  }

  async markUnlocked(sessionId: string): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current || current.finalUnlockedAt) return null;
    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: {
        finalUnlockedAt: new Date(),
        completedAt: new Date(),
        isQualified: true,
        currentState: PUBLIC_FUNNEL_STATE.UNLOCKED,
        currentStep: 5
      }
    })) as RedirectSessionRecord;
  }

  async updateStageTimestamp(sessionId: string, stage: 1 | 2 | 3 | 4 | 5): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current) return null;

    const timestampFieldMap = {
      1: "step1CompleteAt",
      2: "step2CompleteAt",
      3: "step3CompleteAt",
      4: "step4CompleteAt",
      5: "step5CompleteAt"
    } as const;

    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: { [timestampFieldMap[stage]]: new Date(), currentStep: stage } as never
    })) as RedirectSessionRecord;
  }

  async markStepComplete(sessionId: string, step: 1 | 2 | 3 | 4): Promise<RedirectSessionRecord | null> {
    const current = await prisma.redirectSession.findUnique({ where: { id: sessionId } });
    if (!current) return null;

    const timestampFieldMap = {
      1: "step1CompleteAt",
      2: "step2CompleteAt",
      3: "step3CompleteAt",
      4: "step4CompleteAt"
    } as const;

    const timestampField = timestampFieldMap[step];
    const completedSteps = Array.isArray(current.completedSteps) ? Array.from(new Set([...current.completedSteps, step])) : [step];

    return (await prisma.redirectSession.update({
      where: { id: sessionId },
      data: {
        [timestampField]: new Date(),
        currentStep: Math.min(step + 1, 5),
        completedSteps: completedSteps as never
      } as never
    })) as RedirectSessionRecord;
  }

  async markCompleted(sessionId: string): Promise<RedirectSessionRecord | null> {
    const updatedSession = await this.markUnlocked(sessionId);
    if (updatedSession) {
      return updatedSession;
    }

    return (await prisma.redirectSession.findUnique({ where: { id: sessionId } })) as RedirectSessionRecord | null;
  }

  async findByShortCodeAndMemberId(
    shortCode: string,
    memberId: string,
    query: { page: number; limit: number }
  ): Promise<{ data: RedirectSessionRecord[]; total: number }> {
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      prisma.redirectSession.findMany({ where: { shortCode, memberId }, orderBy: { createdAt: "desc" }, skip, take: query.limit }),
      prisma.redirectSession.count({ where: { shortCode, memberId } })
    ]);

    return { data: data as RedirectSessionRecord[], total };
  }

  async findByIds(ids: string[]): Promise<RedirectSessionRecord[]> {
    if (ids.length === 0) return [];
    return (await prisma.redirectSession.findMany({ where: { id: { in: ids } } })) as RedirectSessionRecord[];
  }

  async countQualifiedByMemberId(memberId: string, since: Date): Promise<number> {
    return prisma.redirectSession.count({ where: { memberId, isQualified: true, createdAt: { gte: since } } });
  }

  async countQualifiedByShortCode(shortCode: string, since: Date): Promise<number> {
    return prisma.redirectSession.count({ where: { shortCode, isQualified: true, createdAt: { gte: since } } });
  }

  async countWithAnonymousSession(): Promise<number> {
    return prisma.redirectSession.count({ where: { anonymousSessionId: { not: null } } });
  }
}

export const redirectSessionRepository = new RedirectSessionRepository();
