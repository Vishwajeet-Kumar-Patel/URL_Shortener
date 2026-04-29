import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { randomBytes } from "crypto";
import { getGeoFromHeaders } from "../../utils/geo";
import { parseUserAgent } from "../../utils/user-agent";
import { hashToken } from "../../utils/hash";
import { redirectService } from "./redirect.service";

const adSessions = new Map<
  string,
  {
    targetUrl: string;
    expiresAt: number;
    createdAt: number;
    shortCode: string;
    urlId: string;
    ownerId: string;
    ipAddress: string;
    ipHash: string;
    userAgent: string;
    browser: string;
    os: string;
    deviceType: string;
    referrer?: string;
    country?: string;
    city?: string;
    jsEnabled: boolean;
    cookiesEnabled: boolean;
  }
>();
const AD_SESSION_TTL_MS = 10 * 60 * 1000;
const MIN_CONTINUE_DELAY_MS = 3500;

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
    const result = {
      ...inspected,
      meta: {
        ...meta,
        jsEnabled: req.body?.jsEnabled !== false,
        cookiesEnabled: req.body?.cookiesEnabled !== false
      }
    };

    const sessionId = randomBytes(24).toString("hex");
    adSessions.set(sessionId, {
      targetUrl: result.targetUrl,
      expiresAt: Date.now() + AD_SESSION_TTL_MS,
      createdAt: Date.now(),
      shortCode: result.shortCode,
      urlId: result.urlId,
      ownerId: result.ownerId,
      ipAddress: result.meta.ipAddress,
      ipHash: result.meta.ipHash,
      userAgent: result.meta.userAgent,
      browser: result.meta.browser,
      os: result.meta.os,
      deviceType: result.meta.deviceType,
      referrer: result.meta.referrer,
      country: result.meta.country,
      city: result.meta.city,
      jsEnabled: result.meta.jsEnabled,
      cookiesEnabled: result.meta.cookiesEnabled
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        sessionId,
        continueAfterSeconds: 5
      }
    });
  }

  async completeVisit(req: Request, res: Response): Promise<void> {
    const session = adSessions.get(String(req.params.sessionId));
    if (!session || session.expiresAt < Date.now()) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Session not found or expired"
      });
      return;
    }

    const isBot = this.isBotUserAgent(session.userAgent);
    const isSuspicious = this.isSuspiciousTraffic(session.ipAddress, session.referrer);
    const waitedEnough = Date.now() - session.createdAt >= MIN_CONTINUE_DELAY_MS;
    const isQualified =
      session.jsEnabled &&
      session.cookiesEnabled &&
      !isBot &&
      !isSuspicious &&
      waitedEnough;

    const result = await redirectService.recordClick({
      urlId: session.urlId,
      ownerId: session.ownerId,
      shortCode: session.shortCode,
      ipAddress: session.ipAddress,
      ipHash: session.ipHash,
      userAgent: session.userAgent,
      browser: session.browser,
      os: session.os,
      deviceType: session.deviceType,
      referrer: session.referrer,
      country: session.country,
      city: session.city,
      jsEnabled: session.jsEnabled,
      cookiesEnabled: session.cookiesEnabled,
      isBot,
      isSuspicious,
      isQualified,
      qualificationReason: isQualified
        ? "qualified_after_countdown"
        : !waitedEnough
          ? "countdown_bypassed"
          : isBot
            ? "bot_traffic"
            : isSuspicious
              ? "suspicious_traffic"
              : "client_requirements_missing"
    });
    if (result.isQualified) {
      await redirectService.creditQualifiedPayout({
        ownerId: session.ownerId,
        country: session.country,
        shortCode: session.shortCode,
        clickLogId: result.clickLogId
      });
    }

    adSessions.delete(String(req.params.sessionId));
    res.status(StatusCodes.OK).json({
      success: true,
      data: { redirectUrl: session.targetUrl }
    });
  }

  async redirectByShortCode(req: Request, res: Response): Promise<void> {
    const result = await this.resolveRaw(req);

    if (result.outcome === "ACTIVE") {
      res.redirect(302, result.targetUrl);
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

  private isBotUserAgent(userAgent: string): boolean {
    return /(bot|crawler|spider|curl|wget|headless)/i.test(userAgent);
  }

  private isSuspiciousTraffic(ipAddress: string, referrer?: string): boolean {
    const localIp = ipAddress === "127.0.0.1" || ipAddress === "::1";
    const missingReferrer = !referrer;
    return localIp || missingReferrer;
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
