import { Router } from "express";
import { redirectRateLimitMiddleware } from "../../middlewares/rate-limit.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { redirectController } from "./redirect.controller";

const redirectRouter = Router();

redirectRouter.get(
  "/resolve/:shortCode",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.resolveByShortCode(req, res))
);
redirectRouter.post(
  "/visit/:shortCode",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.startVisit(req, res))
);
redirectRouter.post(
  "/complete/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.completeVisit(req, res))
);

redirectRouter.get(
  "/:shortCode",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.redirectByShortCode(req, res))
);

export { redirectRouter };
