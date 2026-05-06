import { Router } from "express";
import {
	authMiddleware,
	ensureActiveUser,
	ensureVerifiedUser,
	requireAuthenticatedUser
} from "../../middlewares/auth.middleware";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { userController } from "./user.controller";
import { updatePasswordSchema, updateProfileSchema } from "./user.validation";

const userRouter = Router();

userRouter.use(authMiddleware, requireAuthenticatedUser, ensureActiveUser, ensureVerifiedUser);

userRouter.get("/health", asyncHandler((req, res) => userController.moduleHealth(req, res)));
userRouter.get("/me", asyncHandler((req, res) => userController.getProfile(req, res)));
userRouter.get("/:id/anonymous-links", asyncHandler((req, res) => userController.getAnonymousLinks(req, res)));
userRouter.get("/:id/earnings", asyncHandler((req, res) => userController.getEarnings(req, res)));
userRouter.patch(
	"/me",
	validationMiddleware(updateProfileSchema),
	asyncHandler((req, res) => userController.updateProfile(req, res))
);
userRouter.patch(
	"/me/password",
	validationMiddleware(updatePasswordSchema),
	asyncHandler((req, res) => userController.updatePassword(req, res))
);

export { userRouter };
