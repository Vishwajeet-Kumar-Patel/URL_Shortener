import { StatusCodes } from "http-status-codes";
import { randomBytes } from "crypto";
import { anonymousSessionRepository } from "../../repositories/anonymous-session.repository";
import { referralRepository } from "../../repositories/referral.repository";
import { memberMetricsRepository } from "../../repositories/member-metrics.repository";
import { hashToken } from "../../utils/hash";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class AnonSessionService {
  /**
   * Create an anonymous session, optionally tied to a member referrer
   */
  async createSession(input: {
    userAgent: string;
    ipHash: string;
    referralCode?: string;
  }): Promise<{ sessionToken: string; memberId?: string }> {
    let memberId: string | undefined;

    // If referral code provided, look up the member
    if (input.referralCode) {
      const referral = await referralRepository.findByCode(input.referralCode);
      if (!referral) {
        throw buildServiceError("Invalid referral code", StatusCodes.BAD_REQUEST);
      }
      memberId = String(referral.ownerId);
    }

    // Generate unique session token
    const sessionToken = randomBytes(32).toString("hex");

    // Create the session
    const session = await anonymousSessionRepository.createSession({
      sessionToken,
      userAgent: input.userAgent,
      ipHash: input.ipHash,
      referralCode: input.referralCode,
      memberId
    });

    if (!session) {
      throw buildServiceError(
        "Unable to create anonymous session",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Track this user as brought by the member
    if (memberId) {
      await memberMetricsRepository.getOrCreateMetrics(memberId);
      await memberMetricsRepository.incrementUsersBrought(memberId, 1);
    }

    return {
      sessionToken,
      memberId
    };
  }

  /**
   * Validate and retrieve an existing session
   */
  async getSession(sessionToken: string): Promise<{
    sessionToken: string;
    memberId?: string;
    referralCode?: string;
  } | null> {
    const session = await anonymousSessionRepository.findByToken(sessionToken);
    if (!session) return null;

    return {
      sessionToken: session.sessionToken,
      memberId: session.memberId ? String(session.memberId) : undefined,
      referralCode: session.referralCode
    };
  }

  /**
   * Get member's anonymous user statistics
   */
  async getMemberStats(
    memberId: string
  ): Promise<{
    totalUsersBrought: number;
    totalLinksGenerated: number;
    thisMonthUsers: number;
    thisMonthLinks: number;
  } | null> {
    const metrics = await memberMetricsRepository.findByMemberId(memberId);
    if (!metrics) return null;

    return {
      totalUsersBrought: metrics.totalAnonymousUsersBrought,
      totalLinksGenerated: metrics.totalAnonymousLinksGenerated,
      thisMonthUsers: metrics.thisMonthUsers,
      thisMonthLinks: metrics.totalAnonymousLinksGenerated // TODO: track monthly separately
    };
  }

  /**
   * Track that an anonymous user generated a link
   */
  async trackLinkGeneration(
    sessionToken: string,
    memberId?: string
  ): Promise<void> {
    if (memberId) {
      await memberMetricsRepository.incrementLinksGenerated(memberId, 1);
    }
  }
}

export const anonSessionService = new AnonSessionService();
