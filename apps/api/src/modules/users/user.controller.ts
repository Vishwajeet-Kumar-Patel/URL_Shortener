import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { userService } from "./user.service";
import type { UpdatePasswordInput, UpdateProfileInput } from "./user.types";

export class UserController {
  async moduleHealth(_req: Request, res: Response): Promise<void> {
    const health = await userService.getModuleHealth();
    res.status(StatusCodes.OK).json({ success: true, data: health });
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const data = await userService.getProfile(req.authUser!.userId);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async getAnonymousLinks(req: Request, res: Response): Promise<void> {
    const userId = String(req.params.id);
    if (req.authUser!.userId !== userId) {
      res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Forbidden" });
      return;
    }
    const data = await userService.getAnonymousLinks(userId);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async getEarnings(req: Request, res: Response): Promise<void> {
    const userId = String(req.params.id);
    if (req.authUser!.userId !== userId) {
      res.status(StatusCodes.FORBIDDEN).json({ success: false, message: "Forbidden" });
      return;
    }
    const data = await userService.getEarningsSummary(userId);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const payload = req.body as UpdateProfileInput;
    const data = await userService.updateProfile(req.authUser!.userId, payload);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async updatePassword(req: Request, res: Response): Promise<void> {
    const payload = req.body as UpdatePasswordInput;
    await userService.updatePassword(req.authUser!.userId, payload);
    res.status(StatusCodes.OK).json({ success: true, data: null });
  }
}

export const userController = new UserController();
