import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { cpmRateService } from "./cpm-rate.service";
import type { UpsertCpmRateInput } from "./cpm-rate.types";

export class CpmRateController {
  async listAll(_req: Request, res: Response): Promise<void> {
    const data = await cpmRateService.listAll();
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async upsert(req: Request, res: Response): Promise<void> {
    const data = await cpmRateService.upsert(req.body as UpsertCpmRateInput);
    res.status(StatusCodes.OK).json({ success: true, data });
  }
}

export const cpmRateController = new CpmRateController();
