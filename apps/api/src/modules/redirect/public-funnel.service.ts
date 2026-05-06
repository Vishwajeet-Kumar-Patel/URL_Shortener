import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { redirectSessionRepository } from "../../repositories/redirect-session.repository";
import { redirectService } from "./redirect.service";

type ServiceError = Error & { statusCode?: number };

const COUNTDOWN_SECONDS = 10;

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

const ensureDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const requireElapsed = (startedAt: Date | string | undefined | null, label: string): void => {
  const started = ensureDate(startedAt);
  if (!started) {
    throw buildServiceError(`${label} has not started yet`, StatusCodes.FORBIDDEN);
  }

  const secondsElapsed = (Date.now() - started.getTime()) / 1000;
  if (secondsElapsed < COUNTDOWN_SECONDS) {
    throw buildServiceError(
      `${label} still has ${Math.ceil(COUNTDOWN_SECONDS - secondsElapsed)} seconds remaining`,
      429
    );
  }
};

export class PublicFunnelService {
  private getSponsorUrl(): string {
    return env.SPONSOR_OUTBOUND_URL || env.APP_PUBLIC_URL;
  }

  private async loadSession(sessionId: string) {
    const session = await redirectSessionRepository.findById(sessionId);
    if (!session) {
      throw buildServiceError("Session not found", StatusCodes.NOT_FOUND);
    }

    return session;
  }

  async getStatus(sessionId: string): Promise<Record<string, unknown>> {
    const session = await this.loadSession(sessionId);

    return {
      sessionId: String(session._id),
      shortCode: session.shortCode,
      currentState: session.currentState,
      humanVerified: Boolean(session.humanVerified),
      phase1StartedAt: session.phase1StartedAt ?? null,
      phase1CompletedAt: session.phase1CompletedAt ?? null,
      phase2StartedAt: session.phase2StartedAt ?? null,
      phase2CompletedAt: session.phase2CompletedAt ?? null,
      sponsorOpenedAt: session.sponsorOpenedAt ?? null,
      sponsorVerifiedAt: session.sponsorVerifiedAt ?? null,
      finalUnlockedAt: session.finalUnlockedAt ?? null,
      currentStep: session.currentStep,
      completedAt: session.completedAt ?? null,
      canUnlock: Boolean(
        session.humanVerified &&
          session.phase1CompletedAt &&
          session.phase2CompletedAt &&
          session.sponsorOpenedAt &&
          session.sponsorVerifiedAt &&
          !session.finalUnlockedAt
      ),
      sponsorUrl: this.getSponsorUrl()
    };
  }

  async verifyHuman(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (session.finalUnlockedAt) {
      return session;
    }

    if (session.humanVerified) {
      return session;
    }

    if (session.currentState !== "HUMAN_PENDING") {
      throw buildServiceError("Human verification cannot be repeated at this stage", StatusCodes.FORBIDDEN);
    }

    const updated = await redirectSessionRepository.verifyHuman(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to verify human session", StatusCodes.CONFLICT);
    }

    return updated;
  }

  async startPhase1(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (!session.humanVerified) {
      throw buildServiceError("Human verification is required before phase 1", StatusCodes.FORBIDDEN);
    }

    if (session.finalUnlockedAt) {
      return session;
    }

    if (session.phase1StartedAt) {
      return session;
    }

    const updated = await redirectSessionRepository.startPhase1(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to start phase 1", StatusCodes.CONFLICT);
    }

    return updated;
  }

  async completePhase1(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (!session.phase1StartedAt) {
      throw buildServiceError("Phase 1 has not started", StatusCodes.FORBIDDEN);
    }

    if (session.phase1CompletedAt) {
      return session;
    }

    requireElapsed(session.phase1StartedAt, "Phase 1 countdown");

    const updated = await redirectSessionRepository.completePhase1(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to complete phase 1", StatusCodes.CONFLICT);
    }

    return updated;
  }

  async startPhase2(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (!session.phase1CompletedAt) {
      throw buildServiceError("Phase 1 must complete before phase 2", StatusCodes.FORBIDDEN);
    }

    if (session.finalUnlockedAt) {
      return session;
    }

    if (session.phase2StartedAt) {
      return session;
    }

    const updated = await redirectSessionRepository.startPhase2(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to start phase 2", StatusCodes.CONFLICT);
    }

    return updated;
  }

  async completePhase2(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (!session.phase2StartedAt) {
      throw buildServiceError("Phase 2 has not started", StatusCodes.FORBIDDEN);
    }

    if (session.phase2CompletedAt) {
      return session;
    }

    requireElapsed(session.phase2StartedAt, "Phase 2 countdown");

    const updated = await redirectSessionRepository.completePhase2(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to complete phase 2", StatusCodes.CONFLICT);
    }

    return updated;
  }

  async openSponsor(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (!session.phase2CompletedAt) {
      throw buildServiceError("Phase 2 must complete before sponsor verification", StatusCodes.FORBIDDEN);
    }

    const updated = await redirectSessionRepository.markSponsorOpened(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to open sponsor verification", StatusCodes.CONFLICT);
    }

    return {
      session: updated,
      sponsorUrl: this.getSponsorUrl()
    };
  }

  async verifySponsor(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (!session.sponsorOpenedAt) {
      throw buildServiceError("Sponsor visit is required before verification", StatusCodes.FORBIDDEN);
    }

    if (session.sponsorVerifiedAt) {
      return session;
    }

    const updated = await redirectSessionRepository.markSponsorVerified(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to record sponsor verification", StatusCodes.CONFLICT);
    }

    return updated;
  }

  async unlock(sessionId: string) {
    const session = await this.loadSession(sessionId);

    if (session.finalUnlockedAt) {
      return {
        session,
        redirectUrl: session.targetUrl,
        alreadyUnlocked: true
      };
    }

    if (!session.humanVerified) {
      throw buildServiceError("Human verification is required before unlock", StatusCodes.FORBIDDEN);
    }
    if (!session.phase1CompletedAt || !session.phase2CompletedAt) {
      throw buildServiceError("All blog verification steps must be complete before unlock", StatusCodes.FORBIDDEN);
    }
    if (!session.sponsorOpenedAt || !session.sponsorVerifiedAt) {
      throw buildServiceError("Sponsor verification is required before unlock", StatusCodes.FORBIDDEN);
    }

    requireElapsed(session.sponsorVerifiedAt, "Sponsor countdown");

    const payout = await redirectService.creditQualifiedPayout({
      ownerId: String(session.memberId ?? session._id),
      country: session.country || "",
      shortCode: session.shortCode,
      clickLogId: session.clickLogId ? String(session.clickLogId) : "",
      redirectSessionId: String(session._id),
      visitorIpHash: session.ipHash,
      fingerprintHash: session.fingerprintHash,
      memberId: session.memberId ? String(session.memberId) : undefined
    });

    if (!payout) {
      throw buildServiceError("Unable to credit qualified completion", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const updated = await redirectSessionRepository.markUnlocked(sessionId);
    if (!updated) {
      throw buildServiceError("Unable to finalize unlock", StatusCodes.CONFLICT);
    }

    return {
      session: updated,
      redirectUrl: updated.targetUrl,
      payout
    };
  }
}

export const publicFunnelService = new PublicFunnelService();