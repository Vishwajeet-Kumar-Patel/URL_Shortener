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

// Public session events for single-page monetized blog
redirectRouter.post(
  "/session/:sessionId/event",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.sessionEvent(req, res))
);

redirectRouter.get(
  "/session/:sessionId/status",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.getSessionStatus(req, res))
);

// Funnel step validation endpoints
redirectRouter.post(
  "/funnel/validate/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.validateFunnelStep(req, res))
);
redirectRouter.get(
  "/funnel/progress/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.getFunnelProgress(req, res))
);
redirectRouter.get(
  "/funnel/status/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.getFunnelStatus(req, res))
);

redirectRouter.get(
  "/:shortCode",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.redirectByShortCode(req, res))
);

export { redirectRouter };
