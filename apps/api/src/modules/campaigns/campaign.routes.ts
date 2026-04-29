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
import { campaignController } from "./campaign.controller";
import {
  campaignIdParamsSchema,
  createCampaignSchema,
  listCampaignsSchema,
  updateCampaignSchema
} from "./campaign.validation";

const campaignRouter = Router();

campaignRouter.use(
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.MEMBER, ROLES.ADVERTISER, ROLES.ADMIN)
);

campaignRouter.post(
  "/",
  validationMiddleware(createCampaignSchema),
  asyncHandler((req, res) => campaignController.createCampaign(req, res))
);
campaignRouter.post(
  "/create",
  validationMiddleware(createCampaignSchema),
  asyncHandler((req, res) => campaignController.createCampaign(req, res))
);

campaignRouter.get(
  "/",
  validationMiddleware(listCampaignsSchema),
  asyncHandler((req, res) => campaignController.listCampaigns(req, res))
);
campaignRouter.get(
  "/my",
  validationMiddleware(listCampaignsSchema),
  asyncHandler((req, res) => campaignController.listCampaigns(req, res))
);

campaignRouter.get(
  "/:id",
  validationMiddleware(campaignIdParamsSchema),
  asyncHandler((req, res) => campaignController.getCampaign(req, res))
);

campaignRouter.patch(
  "/:id",
  validationMiddleware({ ...campaignIdParamsSchema, ...updateCampaignSchema }),
  asyncHandler((req, res) => campaignController.updateCampaign(req, res))
);
campaignRouter.put(
  "/:id",
  validationMiddleware({ ...campaignIdParamsSchema, ...updateCampaignSchema }),
  asyncHandler((req, res) => campaignController.updateCampaign(req, res))
);

campaignRouter.post(
  "/:id/pause",
  validationMiddleware(campaignIdParamsSchema),
  asyncHandler((req, res) => campaignController.pauseCampaign(req, res))
);

campaignRouter.post(
  "/:id/resume",
  validationMiddleware(campaignIdParamsSchema),
  asyncHandler((req, res) => campaignController.resumeCampaign(req, res))
);

export { campaignRouter };
