import { Router } from "express";
import {
  authMiddleware,
  ensureActiveUser,
  ensureVerifiedUser,
  requireAuthenticatedUser
} from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/rbac.middleware";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import { ROLES } from "../../types/common";
import { asyncHandler } from "../../utils/async-handler";
import { adminController } from "./admin.controller";
import {
  adminCampaignActionParamsSchema,
  adminListUrlsQuerySchema,
  adminListUsersQuerySchema,
  adminListCampaignsQuerySchema,
  adminUpdateCampaignStatusSchema,
  adminListTransactionsQuerySchema,
  adminReportsQuerySchema,
  adminListAnnouncementsQuerySchema,
  adminCreateAnnouncementSchema,
  adminAttachReferralSchema,
  adminUpdateUserRoleSchema,
  adminUpdateUserStatusSchema,
  adminUrlActionParamsSchema,
  adminUserActionParamsSchema
} from "./admin.validation";

const adminRouter = Router();

adminRouter.use(
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN)
);

adminRouter.get(
  "/users",
  validationMiddleware(adminListUsersQuerySchema),
  asyncHandler((req, res) => adminController.listUsers(req, res))
);
adminRouter.post(
  "/users/:id/ban",
  validationMiddleware(adminUserActionParamsSchema),
  asyncHandler((req, res) => adminController.banUser(req, res))
);
adminRouter.post(
  "/users/:id/verify-email",
  validationMiddleware(adminUserActionParamsSchema),
  asyncHandler((req, res) => adminController.verifyUserEmail(req, res))
);
adminRouter.get(
  "/users/:id",
  validationMiddleware(adminUserActionParamsSchema),
  asyncHandler((req, res) => adminController.getUser(req, res))
);
adminRouter.patch(
  "/users/:id/role",
  validationMiddleware(adminUpdateUserRoleSchema),
  asyncHandler((req, res) => adminController.updateUserRole(req, res))
);
adminRouter.patch(
  "/users/:id/status",
  validationMiddleware(adminUpdateUserStatusSchema),
  asyncHandler((req, res) => adminController.updateUserStatus(req, res))
);
adminRouter.delete(
  "/users/:id",
  validationMiddleware(adminUserActionParamsSchema),
  asyncHandler((req, res) => adminController.deleteUser(req, res))
);
adminRouter.get(
  "/urls",
  validationMiddleware(adminListUrlsQuerySchema),
  asyncHandler((req, res) => adminController.listUrls(req, res))
);
adminRouter.post(
  "/urls/:id/pause",
  validationMiddleware(adminUrlActionParamsSchema),
  asyncHandler((req, res) => adminController.pauseUrl(req, res))
);
adminRouter.post(
  "/urls/:id/activate",
  validationMiddleware(adminUrlActionParamsSchema),
  asyncHandler((req, res) => adminController.activateUrl(req, res))
);
adminRouter.delete(
  "/urls/:id",
  validationMiddleware(adminUrlActionParamsSchema),
  asyncHandler((req, res) => adminController.deleteUrl(req, res))
);

adminRouter.get(
  "/campaigns",
  validationMiddleware(adminListCampaignsQuerySchema),
  asyncHandler((req, res) => adminController.listCampaigns(req, res))
);
adminRouter.get(
  "/campaigns/:id",
  validationMiddleware(adminCampaignActionParamsSchema),
  asyncHandler((req, res) => adminController.getCampaign(req, res))
);
adminRouter.patch(
  "/campaigns/:id/status",
  validationMiddleware(adminUpdateCampaignStatusSchema),
  asyncHandler((req, res) => adminController.updateCampaignStatus(req, res))
);
adminRouter.get(
  "/transactions",
  validationMiddleware(adminListTransactionsQuerySchema),
  asyncHandler((req, res) => adminController.listTransactions(req, res))
);
adminRouter.get(
  "/reports",
  validationMiddleware(adminReportsQuerySchema),
  asyncHandler((req, res) => adminController.reports(req, res))
);
adminRouter.get(
  "/announcements",
  validationMiddleware(adminListAnnouncementsQuerySchema),
  asyncHandler((req, res) => adminController.listAnnouncements(req, res))
);
adminRouter.post(
  "/referrals/attach",
  validationMiddleware(adminAttachReferralSchema),
  asyncHandler((req, res) => adminController.attachUserToReferral(req, res))
);
adminRouter.post(
  "/announcements",
  validationMiddleware(adminCreateAnnouncementSchema),
  asyncHandler((req, res) => adminController.createAnnouncement(req, res))
);
adminRouter.get(
  "/earnings",
  asyncHandler((req, res) => adminController.getEarnings(req, res))
);
adminRouter.get(
  "/earnings/summary",
  asyncHandler((req, res) => adminController.getEarningsSummary(req, res))
);

export { adminRouter };
