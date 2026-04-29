import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { referralService } from "./referral.service";
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
}

export const referralController = new ReferralController();
