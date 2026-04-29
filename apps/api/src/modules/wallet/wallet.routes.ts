import { Router } from "express";
import {
  authMiddleware,
  ensureActiveUser,
  ensureVerifiedUser,
  requireAuthenticatedUser
} from "../../middlewares/auth.middleware";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { walletController } from "./wallet.controller";
import { walletLedgerQuerySchema } from "./wallet.validation";

const walletRouter = Router();

walletRouter.get(
  "/summary",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  asyncHandler((req, res) => walletController.getSummary(req, res))
);
walletRouter.get(
  "/",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  asyncHandler((req, res) => walletController.getSummary(req, res))
);

walletRouter.get(
  "/ledger",
  authMiddleware,
  requireAuthenticatedUser,
  ensureActiveUser,
  ensureVerifiedUser,
  validationMiddleware(walletLedgerQuerySchema),
  asyncHandler((req, res) => walletController.listLedger(req, res))
);

export { walletRouter };
