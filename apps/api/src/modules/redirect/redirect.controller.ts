import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { env } from "../../config/env";
import { getGeoFromHeaders } from "../../utils/geo";
import { hashToken } from "../../utils/hash";
import { parseUserAgent } from "../../utils/user-agent";
import { redirectSessionRepository } from "../../repositories/redirect-session.repository";
import { anonSessionService } from "./anon-session.service";
import { publicFunnelService } from "./public-funnel.service";
import { redirectService } from "./redirect.service";
import { createRedirectSessionToken, verifyRedirectSessionToken } from "./redirect-token";

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0];
  }

  return req.ip || "0.0.0.0";
};

const resolveSessionId = (value: string): string | null => {
  const verified = verifyRedirectSessionToken(value);
  if (verified) return verified;
  return value.length === 24 ? value : null;
};

const getStageRoute = (stage: number, sessionToken: string): string => {
  switch (stage) {
    case 1:
      return `/monetize/blog/1?rs=${encodeURIComponent(sessionToken)}`;
    case 2:
      return `/monetize/blog/2?rs=${encodeURIComponent(sessionToken)}`;
    case 3:
      return `/monetize/blog/3?rs=${encodeURIComponent(sessionToken)}`;
    case 4:
      return `/monetize/unlock?rs=${encodeURIComponent(sessionToken)}`;
    default:
      return `/monetize/start?rs=${encodeURIComponent(sessionToken)}`;
  }
};

export class RedirectController {
  async resolveByShortCode(req: Request, res: Response): Promise<void> {
    const result = await redirectService.inspectShortCode(String(req.params.shortCode));
    if (result.outcome !== "ACTIVE") {
      res.status(StatusCodes.NOT_FOUND).json({ success: false, message: result.message });
      return;
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        shortCode: String(req.params.shortCode),
        visitUrl: `${env.CLIENT_ORIGIN}/visit/${encodeURIComponent(String(req.params.shortCode))}`
      }
    });
  }

  async startVisit(req: Request, res: Response): Promise<void> {
    const meta = this.getRequestMeta(req);
    const inspected = await redirectService.inspectShortCode(String(req.params.shortCode));
    if (inspected.outcome !== "ACTIVE") {
      res.status(StatusCodes.NOT_FOUND).json({ success: false, message: inspected.message });
      return;
    }

    const jsEnabled = req.body?.jsEnabled !== false;
    const cookiesEnabled = req.body?.cookiesEnabled !== false;
    const fingerprint = String(req.body?.fingerprint ?? `${meta.userAgent}:${meta.ipAddress}:${req.headers["accept-language"] ?? ""}`);
    const fingerprintHash = hashToken(fingerprint);

    const clickResult = await redirectService.recordClick({
      ...meta,
      urlId: inspected.urlId,
      ownerId: inspected.ownerId,
      jsEnabled,
      cookiesEnabled,
      isBot: false,
      isSuspicious: false,
      isQualified: false,
      qualificationReason: "session_started"
    });

    const referralCode = req.query.ref as string | undefined;
    let anonId: string | undefined;
    let memberId: string | undefined;
    if (referralCode) {
      try {
        const anon = await anonSessionService.createSession({
          userAgent: meta.userAgent,
          ipHash: meta.ipHash,
          referralCode
        });
        anonId = anon.sessionId;
        memberId = anon.memberId;
      } catch {
        // Referral creation is best-effort.
      }
    }

    const session = await redirectSessionRepository.createSession({
      shortCode: inspected.shortCode,
      anonymousSessionId: anonId,
      memberId,
      targetUrl: inspected.targetUrl,
      ipAddress: meta.ipAddress,
      ipHash: meta.ipHash,
      fingerprintHash,
      userAgent: meta.userAgent,
      browser: meta.browser,
      os: meta.os,
      deviceType: meta.deviceType,
      referrer: meta.referrer,
      country: meta.country,
      city: meta.city,
      jsEnabled,
      cookiesEnabled,
      clickLogId: clickResult.clickLogId
    });

    if (!session) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to create redirect session" });
      return;
    }

    const sessionToken = createRedirectSessionToken(String(session.id));
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        sessionId: String(session.id),
        sessionToken,
        nextRoute: `/visit/${encodeURIComponent(inspected.shortCode)}?rs=${encodeURIComponent(sessionToken)}`,
        shortCode: inspected.shortCode
      }
    });
  }

  async verifyHuman(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const session = await publicFunnelService.verifyHuman(sessionId);
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          sessionId: String(session.id),
          currentState: session.currentState,
          nextRoute: `/monetize/blog/${encodeURIComponent(String(session.id))}?phase=1`
        }
      });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Verify human error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to verify human session" });
    }
  }

  async startPhase1(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const session = await publicFunnelService.startPhase1(sessionId);
      res.status(StatusCodes.OK).json({ success: true, data: { sessionId: String(session.id), currentState: session.currentState, countdownSeconds: 10 } });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Start phase 1 error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to start phase 1" });
    }
  }

  async completePhase1(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const session = await publicFunnelService.completePhase1(sessionId);
      res.status(StatusCodes.OK).json({ success: true, data: { sessionId: String(session.id), currentState: session.currentState } });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Complete phase 1 error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to complete phase 1" });
    }
  }

  async startPhase2(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const session = await publicFunnelService.startPhase2(sessionId);
      res.status(StatusCodes.OK).json({ success: true, data: { sessionId: String(session.id), currentState: session.currentState, countdownSeconds: 10 } });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Start phase 2 error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to start phase 2" });
    }
  }

  async completePhase2(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const session = await publicFunnelService.completePhase2(sessionId);
      res.status(StatusCodes.OK).json({ success: true, data: { sessionId: String(session.id), currentState: session.currentState } });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Complete phase 2 error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to complete phase 2" });
    }
  }

  async sponsorOpen(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const result = await publicFunnelService.openSponsor(sessionId);
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          sessionId: String(result.session.id),
          currentState: result.session.currentState,
          sponsorUrl: result.sponsorUrl
        }
      });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Sponsor open error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to open sponsor" });
    }
  }

  async sponsorVerify(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const session = await publicFunnelService.verifySponsor(sessionId);
      res.status(StatusCodes.OK).json({ success: true, data: { sessionId: String(session.id), currentState: session.currentState, countdownSeconds: 10 } });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Sponsor verify error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to verify sponsor visit" });
    }
  }

  async unlock(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const result = await publicFunnelService.unlock(sessionId);
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          redirectUrl: result.redirectUrl,
          amount: result.payout?.amount ?? 0,
          adminAmount: result.payout?.adminAmount ?? 0,
          currency: result.payout?.currency ?? "INR"
        }
      });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Unlock error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to unlock destination" });
    }
  }

  async completeVisit(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const result = await publicFunnelService.unlock(sessionId);
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          redirectUrl: result.redirectUrl,
          amount: result.payout?.amount ?? 0,
          adminAmount: result.payout?.adminAmount ?? 0,
          currency: result.payout?.currency ?? "INR"
        }
      });
    } catch (error) {
      console.error("Complete visit error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
  }

  async redirectByShortCode(req: Request, res: Response): Promise<void> {
    const result = await redirectService.inspectShortCode(String(req.params.shortCode));

    if (result.outcome === "ACTIVE") {
      res.redirect(302, `${env.CLIENT_ORIGIN}/visit/${encodeURIComponent(String(req.params.shortCode))}`);
      return;
    }

    if (result.outcome === "PAUSED") {
      res.status(StatusCodes.GONE).type("html").send(buildRedirectStatusPage("Paused", result.message));
      return;
    }

    if (result.outcome === "HIDDEN") {
      res.status(StatusCodes.NOT_FOUND).type("html").send(buildRedirectStatusPage("Hidden", result.message));
      return;
    }

    if (result.outcome === "DELETED") {
      res.status(StatusCodes.GONE).type("html").send(buildRedirectStatusPage("Deleted", result.message));
      return;
    }

    res.status(StatusCodes.NOT_FOUND).type("html").send(buildRedirectStatusPage("Not Found", result.message));
  }

  private getRequestMeta(req: Request) {
    const referrerHeader = req.headers.referer;
    const referrer =
      typeof referrerHeader === "string"
        ? referrerHeader
        : Array.isArray(referrerHeader)
          ? referrerHeader[0]
          : undefined;
    const ipAddress = getClientIp(req);
    const userAgent = req.headers["user-agent"] ?? "unknown";
    const { browser, os, deviceType } = parseUserAgent(String(userAgent));
    const geo = getGeoFromHeaders(req.headers);
    return {
      shortCode: String(req.params.shortCode),
      ipAddress,
      ipHash: hashToken(ipAddress),
      userAgent: String(userAgent),
      browser,
      os,
      deviceType,
      referrer,
      country: geo.country,
      city: geo.city
    };
  }

  async validateFunnelStep(req: Request, res: Response): Promise<void> {
    try {
      const { funnelValidationService } = await import("./funnel-validation.service");
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }
      const { currentStep, scrollPosition, viewportHeight, ctaClicked, hasScrolledEnough } = req.body;

      const result = await funnelValidationService.validateAndAdvanceStep(sessionId, currentStep, {
        scrollPosition,
        viewportHeight,
        ctaClicked,
        hasScrolledEnough
      });

      res.status(StatusCodes.OK).json({
        success: result.isValid,
        data: {
          isValid: result.isValid,
          nextStep: result.nextStep,
          message: result.message,
          nextRoute: getStageRoute(result.nextStep, String(req.body?.sessionToken ?? req.params.sessionId))
        }
      });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Validate funnel step error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to validate funnel step" });
    }
  }

  async getFunnelProgress(req: Request, res: Response): Promise<void> {
    try {
      const { funnelValidationService } = await import("./funnel-validation.service");
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const progress = await funnelValidationService.getProgress(sessionId);

      if (!progress) {
        res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Funnel session not found" });
        return;
      }

      res.status(StatusCodes.OK).json({ success: true, data: progress });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Get funnel progress error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to get funnel progress" });
    }
  }

  async getFunnelStatus(req: Request, res: Response): Promise<void> {
    try {
      const { funnelValidationService } = await import("./funnel-validation.service");
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const status = await funnelValidationService.getSessionStatus(sessionId);

      res.status(StatusCodes.OK).json({ success: true, data: status });
    } catch (error: any) {
      if (error && typeof error.statusCode === "number") {
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
      }
      console.error("Get funnel status error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to get funnel status" });
    }
  }

  async sessionEvent(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const { event, scrollPosition, maxScrollPosition, viewportHeight } = req.body as Record<string, unknown>;
      if (!event) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Missing event" });
        return;
      }

      switch (String(event)) {
        case "timer1":
          await redirectSessionRepository.updateStageTimestamp(sessionId, 1);
          await redirectSessionRepository.updateStep(sessionId, 1, {});
          break;
        case "scroll":
          await redirectSessionRepository.updateStep(sessionId, 2, {
            scrollPosition: Number(scrollPosition || 100),
            maxScrollPosition: Number(maxScrollPosition || 100),
            viewportHeight: Number(viewportHeight || 0),
            hasScrolledEnough: true
          });
          await redirectSessionRepository.updateStageTimestamp(sessionId, 2);
          break;
        case "timer2":
          await redirectSessionRepository.updateStageTimestamp(sessionId, 2);
          break;
        case "timer3":
          await redirectSessionRepository.updateStageTimestamp(sessionId, 3);
          break;
        case "sponsor":
          await redirectSessionRepository.markSponsorClicked(sessionId);
          // Ensure step 3 is recorded as completed when a sponsor click occurs.
          await redirectSessionRepository.markStepComplete(sessionId, 3);
          await redirectSessionRepository.updateStep(sessionId, 4, { ctaClicked: true });
          break;
        case "focus":
          await redirectSessionRepository.markAsQualified(sessionId);
          break;
        case "ad_timer1_popup":
        case "ad_timer2_popup":
          break;
        default:
          break;
      }

      res.status(StatusCodes.OK).json({ success: true });
    } catch (error) {
      console.error("Session event error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to record session event" });
    }
  }

  async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = resolveSessionId(String(req.params.sessionId));
      if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid session token" });
        return;
      }

      const session = await redirectSessionRepository.findById(sessionId);
      if (!session) {
        res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Session not found" });
        return;
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          currentStep: session.currentStep,
          completedSteps: session.completedSteps,
          isQualified: session.isQualified,
          currentState: session.currentState,
          humanVerified: Boolean(session.humanVerified),
          phase1StartedAt: session.phase1StartedAt ?? null,
          phase1CompletedAt: session.phase1CompletedAt ?? null,
          phase2StartedAt: session.phase2StartedAt ?? null,
          phase2CompletedAt: session.phase2CompletedAt ?? null,
          sponsorOpenedAt: session.sponsorOpenedAt ?? null,
          sponsorVerifiedAt: session.sponsorVerifiedAt ?? null,
          finalUnlockedAt: session.finalUnlockedAt ?? null,
          sponsorClicked: Boolean(session.sponsorClickedAt),
          canUnlock: Boolean(session.humanVerified && session.phase1CompletedAt && session.phase2CompletedAt && session.sponsorOpenedAt && session.sponsorVerifiedAt && !session.finalUnlockedAt),
          completedAt: session.completedAt,
          shortCode: session.shortCode
        }
      });
    } catch (error) {
      console.error("Get session status error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to retrieve session" });
    }
  }
}

const buildRedirectStatusPage = (title: string, message: string): string => {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} - Link Shortener</title>
    <style>
      body { margin: 0; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(160deg, #f1f5f9, #e2e8f0); color: #0f172a; }
      .wrapper { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 32px; }
      .card { max-width: 560px; background: #ffffff; border-radius: 20px; padding: 36px; box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12); border: 1px solid #e2e8f0; }
      .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #0f172a; color: #f8fafc; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0; font-size: 16px; line-height: 1.5; }
      .hint { margin-top: 22px; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <span class="badge">Link Status</span>
        <h1>${title}</h1>
        <p>${message}</p>
        <p class="hint">If you believe this is an error, contact the link owner or try again later.</p>
      </div>
    </div>
  </body>
</html>`;
};

export const redirectController = new RedirectController();
