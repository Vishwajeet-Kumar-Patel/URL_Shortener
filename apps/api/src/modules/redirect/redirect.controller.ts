import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { getGeoFromHeaders } from "../../utils/geo";
import { parseUserAgent } from "../../utils/user-agent";
import { hashToken } from "../../utils/hash";
import { env } from "../../config/env";
import { redirectService } from "./redirect.service";
import { redirectSessionRepository } from "../../repositories/redirect-session.repository";
import { clickRepository } from "../../repositories/click.repository";
import { anonSessionService } from "./anon-session.service";

// We persist redirect sessions to DB; no in-memory ad sessions used.

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
        targetUrl: result.targetUrl
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

    // Create initial raw click log and increment raw counter
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

    // Create persistent redirect session
    const session = await redirectSessionRepository.createSession({
      shortCode: inspected.shortCode,
      anonymousSessionId: undefined,
      memberId: undefined,
      targetUrl: inspected.targetUrl,
      ipAddress: meta.ipAddress,
      ipHash: meta.ipHash,
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

    res.status(StatusCodes.OK).json({ success: true, data: { sessionId: String(session._id), continueAfterSeconds: 5 } });
  }

  async completeVisit(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
      const session = await redirectSessionRepository.findById(sessionId);
      
      if (!session) {
        res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Session not found" });
        return;
      }

      // Try to mark click as qualified (optional - don't crash if it fails)
      if (session.clickLogId) {
        try {
          await clickRepository.markClickQualified(String(session.clickLogId));
        } catch (err) {
          console.error("Failed to mark click qualified:", err);
        }
      }

      // Try to credit payout (optional - don't crash if it fails)
      try {
        const inspected = await redirectService.inspectShortCode(session.shortCode);
        if (inspected.outcome === "ACTIVE") {
          await redirectService.creditQualifiedPayout({
            ownerId: inspected.ownerId,
            country: session.country || "",
            shortCode: session.shortCode,
            clickLogId: session.clickLogId ? String(session.clickLogId) : ""
          });
        }
      } catch (err) {
        console.error("Failed to credit payout:", err);
      }

      // Always return the redirect URL
      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: { redirectUrl: session.targetUrl } 
      });
    } catch (error) {
      console.error("Complete visit error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  }

  async redirectByShortCode(req: Request, res: Response): Promise<void> {
    const result = await this.resolveRaw(req);

    if (result.outcome === "ACTIVE") {
      // Create a redirect session for every hit and record raw click immediately
      const meta = this.getRequestMeta(req);
      const jsEnabled = true;
      const cookiesEnabled = true;

      const clickResult = await redirectService.recordClick({
        ...meta,
        urlId: result.urlId,
        ownerId: result.ownerId,
        jsEnabled,
        cookiesEnabled,
        isBot: false,
        isSuspicious: false,
        isQualified: false,
        qualificationReason: "initial_visit"
      });

      // If referral is provided, try to create anon session
      let anonId: string | undefined = undefined;
      let memberId: string | undefined = undefined;
      const referralCode = req.query.ref as string | undefined;
      if (referralCode) {
        try {
          const anon = await anonSessionService.createSession({
            userAgent: meta.userAgent,
            ipHash: meta.ipHash,
            referralCode
          });
          anonId = anon.sessionId;
          memberId = anon.memberId;
        } catch (_) {
          // ignore referral creation errors; still create session
        }
      }

      const session = await redirectSessionRepository.createSession({
        shortCode: result.shortCode,
        anonymousSessionId: anonId,
        memberId: memberId,
        targetUrl: result.targetUrl,
        ipAddress: meta.ipAddress,
        ipHash: meta.ipHash,
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

      // Redirect visitor into the single monetized blog page using persistent session id
      // e.g. /blog/monetized?token=sessionId
      res.redirect(302, `${env.CLIENT_ORIGIN}/blog/monetized?token=${String(session._id)}`);
      return;
    }

    if (result.outcome === "PAUSED") {
      res
        .status(StatusCodes.GONE)
        .type("html")
        .send(buildRedirectStatusPage("Paused", result.message));
      return;
    }

    if (result.outcome === "HIDDEN") {
      res
        .status(StatusCodes.NOT_FOUND)
        .type("html")
        .send(buildRedirectStatusPage("Hidden", result.message));
      return;
    }

    if (result.outcome === "DELETED") {
      res
        .status(StatusCodes.GONE)
        .type("html")
        .send(buildRedirectStatusPage("Deleted", result.message));
      return;
    }

    res
      .status(StatusCodes.NOT_FOUND)
      .type("html")
      .send(buildRedirectStatusPage("Not Found", result.message));
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

  private async resolveRaw(req: Request) {
    return redirectService.resolveShortCode(this.getRequestMeta(req));
  }



  async validateFunnelStep(req: Request, res: Response): Promise<void> {
    try {
      const { funnelValidationService } = await import("./funnel-validation.service");
      const sessionId = String(req.params.sessionId);
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
          message: result.message
        }
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to validate funnel step"
      });
    }
  }

  async getFunnelProgress(req: Request, res: Response): Promise<void> {
    try {
      const { funnelValidationService } = await import("./funnel-validation.service");
      const sessionId = String(req.params.sessionId);

      const progress = await funnelValidationService.getProgress(sessionId);

      if (!progress) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Funnel session not found"
        });
        return;
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: progress
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get funnel progress"
      });
    }
  }

  async getFunnelStatus(req: Request, res: Response): Promise<void> {
    try {
      const { funnelValidationService } = await import("./funnel-validation.service");
      const sessionId = String(req.params.sessionId);

      const status = await funnelValidationService.getSessionStatus(sessionId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to get funnel status"
      });
    }
  }

  // New: receive single-page monetization events from public blog page
  async sessionEvent(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
      const { event, scrollPosition, maxScrollPosition, viewportHeight } = req.body as any;

      if (!event) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Missing event" });
        return;
      }

      // Map events to repository updates
      switch (event) {
        case "timer1":
          // entered phase 2 (scroll phase)
          await redirectSessionRepository.addStepTiming(sessionId, 2, { step: 2, enteredAt: new Date() });
          break;
        case "scroll":
          await redirectSessionRepository.updateStep(sessionId, 2, {
            scrollPosition: scrollPosition || 100,
            maxScrollPosition: maxScrollPosition || 100,
            viewportHeight: viewportHeight || 0,
            hasScrolledEnough: true
          });
          // mark entry to next timer step
          await redirectSessionRepository.addStepTiming(sessionId, 3, { step: 3, enteredAt: new Date() });
          break;
        case "timer2":
          await redirectSessionRepository.addStepTiming(sessionId, 4, { step: 4, enteredAt: new Date() });
          break;
        case "sponsor":
          await redirectSessionRepository.updateStep(sessionId, 4, { ctaClicked: true });
          // sponsor opened; prepare final step
          await redirectSessionRepository.addStepTiming(sessionId, 5, { step: 5, enteredAt: new Date() });
          break;
        case "focus":
          // final qualification
          await redirectSessionRepository.markAsQualified(sessionId);
          break;
        default:
          // unknown event - ignore
          break;
      }

      res.status(StatusCodes.OK).json({ success: true });
    } catch (error) {
      console.error("Session event error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to record session event" });
    }
  }

  // New: public status for session
  async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
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
          targetUrl: session.targetUrl
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
