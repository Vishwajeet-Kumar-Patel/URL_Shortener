import { Router } from "express";
import {
  authMiddleware,
  ensureActiveUser,
  ensureVerifiedUser,
  requireAuthenticatedUser
} from "../../middlewares/auth.middleware";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { urlController } from "./url.controller";
import {
  createUrlSchema,
  getMyUrlByIdSchema,
  listUrlsSchema,
  updateUrlSchema,
  urlIdParamsSchema
} from "./url.validation";

const urlRouter = Router();

// Public create endpoint - allows anonymous users to create short links (guest)
// Accessible without authentication, but optional referral code tracking
urlRouter.post(
  "/public",
  validationMiddleware(createUrlSchema),
  asyncHandler((req, res) => urlController.createPublicUrl(req, res))
);

urlRouter.use(authMiddleware, requireAuthenticatedUser, ensureActiveUser, ensureVerifiedUser);

urlRouter.post(
  "/bulk",
  asyncHandler((req, res) => urlController.createBulkUrls(req, res))
);
urlRouter.post(
  "/",
  validationMiddleware(createUrlSchema),
  asyncHandler((req, res) => urlController.createOwnUrl(req, res))
);
urlRouter.post(
  "/create",
  validationMiddleware(createUrlSchema),
  asyncHandler((req, res) => urlController.createOwnUrl(req, res))
);
urlRouter.get(
  "/",
  validationMiddleware(listUrlsSchema),
  asyncHandler((req, res) => urlController.listOwnUrls(req, res))
);
urlRouter.get(
  "/my-links",
  validationMiddleware(listUrlsSchema),
  asyncHandler((req, res) => urlController.listOwnUrls(req, res))
);
urlRouter.get(
  "/:id",
  validationMiddleware(getMyUrlByIdSchema),
  asyncHandler((req, res) => urlController.getOwnUrlById(req, res))
);
urlRouter.patch(
  "/:id",
  validationMiddleware({ ...getMyUrlByIdSchema, ...updateUrlSchema }),
  asyncHandler((req, res) => urlController.updateOwnUrl(req, res))
);
urlRouter.put(
  "/:id",
  validationMiddleware({ ...getMyUrlByIdSchema, ...updateUrlSchema }),
  asyncHandler((req, res) => urlController.updateOwnUrl(req, res))
);
urlRouter.post(
  "/:id/pause",
  validationMiddleware(urlIdParamsSchema),
  asyncHandler((req, res) => urlController.pauseOwnUrl(req, res))
);
urlRouter.post(
  "/:id/hide",
  validationMiddleware(urlIdParamsSchema),
  asyncHandler((req, res) => urlController.hideOwnUrl(req, res))
);
urlRouter.post(
  "/:id/activate",
  validationMiddleware(urlIdParamsSchema),
  asyncHandler((req, res) => urlController.activateOwnUrl(req, res))
);
urlRouter.delete(
  "/:id",
  validationMiddleware(urlIdParamsSchema),
  asyncHandler((req, res) => urlController.deleteOwnUrl(req, res))
);

export { urlRouter };
