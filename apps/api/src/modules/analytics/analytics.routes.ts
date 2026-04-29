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
import { analyticsController } from "./analytics.controller";
import {
  analyticsExportQuerySchema,
  analyticsLinkParamsSchema,
  analyticsLinkQuerySchema,
  analyticsOverviewQuerySchema,
  analyticsPresetQuerySchema,
  analyticsTopLinksQuerySchema
} from "./analytics.validation";

const analyticsRouter = Router();

analyticsRouter.get(
  "/overview",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(analyticsOverviewQuerySchema),
  asyncHandler((req, res) => analyticsController.userOverview(req, res))
);
analyticsRouter.get(
  "/link/:id",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware({ ...analyticsLinkParamsSchema, ...analyticsLinkQuerySchema }),
  asyncHandler((req, res) => analyticsController.userLinkDetails(req, res))
);
analyticsRouter.get(
  "/earnings",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(analyticsOverviewQuerySchema),
  asyncHandler((req, res) => analyticsController.userOverview(req, res))
);

analyticsRouter.get(
  "/me/overview",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(analyticsOverviewQuerySchema),
  asyncHandler((req, res) => analyticsController.userOverview(req, res))
);
analyticsRouter.get(
  "/me/links/top",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(analyticsTopLinksQuerySchema),
  asyncHandler((req, res) => analyticsController.userTopLinks(req, res))
);
analyticsRouter.get(
  "/me/links/:id",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware({ ...analyticsLinkParamsSchema, ...analyticsLinkQuerySchema }),
  asyncHandler((req, res) => analyticsController.userLinkDetails(req, res))
);
analyticsRouter.get(
  "/me/export",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(analyticsExportQuerySchema),
  asyncHandler((req, res) => analyticsController.userExport(req, res))
);
analyticsRouter.get(
  "/me/presets",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(analyticsPresetQuerySchema),
  asyncHandler((req, res) => analyticsController.userPresets(req, res))
);
analyticsRouter.get(
  "/admin/overview",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN),
  validationMiddleware(analyticsOverviewQuerySchema),
  asyncHandler((req, res) => analyticsController.adminOverview(req, res))
);
analyticsRouter.get(
  "/admin/links/top",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN),
  validationMiddleware(analyticsTopLinksQuerySchema),
  asyncHandler((req, res) => analyticsController.adminTopLinks(req, res))
);
analyticsRouter.get(
  "/admin/export",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN),
  validationMiddleware(analyticsExportQuerySchema),
  asyncHandler((req, res) => analyticsController.adminExport(req, res))
);
analyticsRouter.get(
  "/admin/presets",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN),
  validationMiddleware(analyticsPresetQuerySchema),
  asyncHandler((req, res) => analyticsController.adminPresets(req, res))
);

export { analyticsRouter };
