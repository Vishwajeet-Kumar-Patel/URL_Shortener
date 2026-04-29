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
import { withdrawalController } from "./withdrawal.controller";
import {
  adminUpdateWithdrawalSchema,
  createWithdrawalSchema,
  listWithdrawalsSchema
} from "./withdrawal.validation";

const withdrawalRouter = Router();

withdrawalRouter.post(
  "/",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(createWithdrawalSchema),
  asyncHandler((req, res) => withdrawalController.createWithdrawal(req, res))
);
withdrawalRouter.post(
  "/request",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(createWithdrawalSchema),
  asyncHandler((req, res) => withdrawalController.createWithdrawal(req, res))
);

withdrawalRouter.get(
  "/",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(listWithdrawalsSchema),
  asyncHandler((req, res) => withdrawalController.listWithdrawals(req, res))
);
withdrawalRouter.get(
  "/history",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(listWithdrawalsSchema),
  asyncHandler((req, res) => withdrawalController.listWithdrawals(req, res))
);

withdrawalRouter.get(
  "/admin",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN),
  validationMiddleware(listWithdrawalsSchema),
  asyncHandler((req, res) => withdrawalController.listAll(req, res))
);

withdrawalRouter.patch(
  "/admin/:id",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  requireRoles(ROLES.ADMIN),
  validationMiddleware(adminUpdateWithdrawalSchema),
  asyncHandler((req, res) => withdrawalController.updateStatus(req, res))
);

export { withdrawalRouter };
