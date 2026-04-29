import { Router } from "express";
import {
  authMiddleware,
  ensureActiveUser,
  ensureVerifiedUser,
  requireAuthenticatedUser
} from "../../middlewares/auth.middleware";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { referralController } from "./referral.controller";
import { referralEarningsQuerySchema } from "./referral.validation";

const referralRouter = Router();

referralRouter.use(authMiddleware, requireAuthenticatedUser, ensureActiveUser, ensureVerifiedUser);

referralRouter.get(
  "/me",
  asyncHandler((req, res) => referralController.getMyReferral(req, res))
);
referralRouter.get(
  "/earnings",
  validationMiddleware(referralEarningsQuerySchema),
  asyncHandler((req, res) => referralController.listMyEarnings(req, res))
);

export { referralRouter };
