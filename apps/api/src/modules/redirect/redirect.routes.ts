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
  "/verify-human/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.verifyHuman(req, res))
);
redirectRouter.post(
  "/phase1/start/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.startPhase1(req, res))
);
redirectRouter.post(
  "/phase1/complete/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.completePhase1(req, res))
);
redirectRouter.post(
  "/phase2/start/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.startPhase2(req, res))
);
redirectRouter.post(
  "/phase2/complete/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.completePhase2(req, res))
);
redirectRouter.post(
  "/sponsor/open/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.sponsorOpen(req, res))
);
redirectRouter.post(
  "/sponsor/verify/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.sponsorVerify(req, res))
);
redirectRouter.post(
  "/unlock/:sessionId",
  redirectRateLimitMiddleware,
  asyncHandler((req, res) => redirectController.unlock(req, res))
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
