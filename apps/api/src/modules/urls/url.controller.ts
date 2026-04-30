import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { URL_STATUS } from "../../types/common";
import { hashToken } from "../../utils/hash";
import { urlService } from "./url.service";
import type { CreateShortUrlInput, BulkCreateShortUrlInput, ListUserUrlsQuery, UpdateShortUrlInput } from "./url.types";

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || "0.0.0.0";
};

export class UrlController {
  async createOwnUrl(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateShortUrlInput;
    const data = await urlService.createUrl(req.authUser!.userId, payload);
    res.status(StatusCodes.CREATED).json({ success: true, data });
  }

  async createBulkUrls(req: Request, res: Response): Promise<void> {
    const payload = req.body as BulkCreateShortUrlInput;
    const data = await urlService.createBulkUrls(req.authUser!.userId, payload);
    res.status(StatusCodes.CREATED).json({ success: true, data });
  }

  async createPublicUrl(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateShortUrlInput;
    const body = req.body as Record<string, unknown>;
    
    // Extract optional referral code and member info
    const referralCode = body.referralCode as string | undefined;
    const createdByMemberId = body.createdByMemberId as string | undefined;
    const anonSessionId = body.anonSessionId as string | undefined;
    
    // Capture request metadata for session creation if needed
    const userAgent = req.headers["user-agent"] ?? "unknown";
    const ipAddress = getClientIp(req);
    const ipHash = hashToken(ipAddress);
    
    const data = await urlService.createPublicUrl(payload, {
      createdByMemberId,
      anonSessionId,
      referralCode,
      userAgent,
      ipHash
    });
    res.status(StatusCodes.CREATED).json({ success: true, data });
  }

  async listOwnUrls(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListUserUrlsQuery;
    const data = await urlService.listOwnUrls(req.authUser!.userId, query);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async getOwnUrlById(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const data = await urlService.getOwnUrlById(req.authUser!.userId, id);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async updateOwnUrl(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const payload = req.body as UpdateShortUrlInput;
    const data = await urlService.updateOwnUrl(req.authUser!.userId, id, payload);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async pauseOwnUrl(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const data = await urlService.changeOwnUrlStatus(req.authUser!.userId, id, URL_STATUS.PAUSED);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async hideOwnUrl(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const data = await urlService.changeOwnUrlStatus(req.authUser!.userId, id, URL_STATUS.HIDDEN);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async activateOwnUrl(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const data = await urlService.changeOwnUrlStatus(req.authUser!.userId, id, URL_STATUS.ACTIVE);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async deleteOwnUrl(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await urlService.deleteOwnUrl(req.authUser!.userId, id);
    res.status(StatusCodes.OK).json({ success: true, data: null });
  }
}

export const urlController = new UrlController();
