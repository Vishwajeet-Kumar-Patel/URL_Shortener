import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { adminService } from "./admin.service";
import type {
  AdminListCampaignsQuery,
  AdminListTransactionsQuery,
  AdminListAnnouncementsQuery,
  AdminCreateAnnouncementInput,
  AdminAttachReferralInput,
  AdminListUrlsQuery,
  AdminListUsersQuery,
  AdminReportsQuery
} from "./admin.types";

export class AdminController {
  async attachUserToReferral(req: Request, res: Response): Promise<void> {
    const data = await adminService.attachUserToReferral(req.body as AdminAttachReferralInput);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    const data = await adminService.listUsers(req.query as unknown as AdminListUsersQuery);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async banUser(req: Request, res: Response): Promise<void> {
    const data = await adminService.banUser(req.authUser!.userId, String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    const data = await adminService.deleteUser(req.authUser!.userId, String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async getUser(req: Request, res: Response): Promise<void> {
    const data = await adminService.getUserById(String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async updateUserRole(req: Request, res: Response): Promise<void> {
    const data = await adminService.updateUserRole(req.authUser!.userId, String(req.params.id), req.body.role);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    const data = await adminService.updateUserStatus(
      req.authUser!.userId,
      String(req.params.id),
      req.body.status
    );
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async verifyUserEmail(req: Request, res: Response): Promise<void> {
    const data = await adminService.verifyUserEmail(String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async listUrls(req: Request, res: Response): Promise<void> {
    const data = await adminService.listUrls(req.query as unknown as AdminListUrlsQuery);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async pauseUrl(req: Request, res: Response): Promise<void> {
    const data = await adminService.pauseUrl(String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async activateUrl(req: Request, res: Response): Promise<void> {
    const data = await adminService.activateUrl(String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async deleteUrl(req: Request, res: Response): Promise<void> {
    const data = await adminService.deleteUrl(String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async listCampaigns(req: Request, res: Response): Promise<void> {
    const data = await adminService.listCampaigns(req.query as unknown as AdminListCampaignsQuery);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async getCampaign(req: Request, res: Response): Promise<void> {
    const data = await adminService.getCampaign(String(req.params.id));
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async updateCampaignStatus(req: Request, res: Response): Promise<void> {
    const data = await adminService.updateCampaignStatus(
      String(req.params.id),
      req.body.status,
      req.authUser!.userId,
      req.body.moderationNote
    );
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async listTransactions(req: Request, res: Response): Promise<void> {
    const data = await adminService.listTransactions(req.query as unknown as AdminListTransactionsQuery);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async reports(req: Request, res: Response): Promise<void> {
    const data = await adminService.reports(req.query as unknown as AdminReportsQuery);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async listAnnouncements(req: Request, res: Response): Promise<void> {
    const data = await adminService.listAnnouncements(req.query as unknown as AdminListAnnouncementsQuery);
    res.status(StatusCodes.OK).json({ success: true, data });
  }

  async createAnnouncement(req: Request, res: Response): Promise<void> {
    const data = await adminService.createAnnouncement(
      req.authUser!.userId,
      req.body as AdminCreateAnnouncementInput
    );
    res.status(StatusCodes.OK).json({ success: true, data });
  }
}

export const adminController = new AdminController();
