import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { referralService } from "./referral.service";
import { anonSessionService } from "../redirect/anon-session.service";
import type { ReferralEarningsQuery } from "./referral.types";

export class ReferralController {
  async getMyReferral(req: Request, res: Response): Promise<void> {
    const data = await referralService.getMyReferral(req.authUser!.userId);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async listMyEarnings(req: Request, res: Response): Promise<void> {
    const data = await referralService.listMyEarnings(
      req.authUser!.userId,
      req.query as unknown as ReferralEarningsQuery
    );
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async getTrafficStats(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const data = await anonSessionService.getMemberTrafficSessions(req.authUser!.userId, { page, limit });
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async getGeneralStats(req: Request, res: Response): Promise<void> {
    const data = await anonSessionService.getMemberStats(req.authUser!.userId);
    res.status(StatusCodes.OK).json({ success: true, data });
  }
}

export const referralController = new ReferralController();
