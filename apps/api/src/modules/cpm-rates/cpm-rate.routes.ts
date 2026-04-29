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
import { cpmRateController } from "./cpm-rate.controller";
import { upsertCpmRateSchema } from "./cpm-rate.validation";

const cpmRateRouter = Router();

cpmRateRouter.use(
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN)
);

cpmRateRouter.get("/", asyncHandler((req, res) => cpmRateController.listAll(req, res)));
cpmRateRouter.post(
  "/",
  validationMiddleware(upsertCpmRateSchema),
  asyncHandler((req, res) => cpmRateController.upsert(req, res))
);

export { cpmRateRouter };
