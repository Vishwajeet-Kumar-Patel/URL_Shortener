import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { URL_STATUS } from "../../types/common";
import { urlService } from "./url.service";
import type { CreateShortUrlInput, ListUserUrlsQuery, UpdateShortUrlInput } from "./url.types";

export class UrlController {
  async createOwnUrl(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateShortUrlInput;
    const data = await urlService.createUrl(req.authUser!.userId, payload);
    res.status(StatusCodes.CREATED).json({ success: true, data });
  }

  async createPublicUrl(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateShortUrlInput;
    
    // Extract optional referral code and member info from session or query
    const createdByMemberId = (req.body as Record<string, unknown>).createdByMemberId as string | undefined;
    const anonSessionId = (req.body as Record<string, unknown>).anonSessionId as string | undefined;
    
    const data = await urlService.createPublicUrl(payload, {
      createdByMemberId,
      anonSessionId
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
