import { StatusCodes } from "http-status-codes";
import { randomBytes } from "crypto";
import {
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
  PASSWORD_RESET_TOKEN_TTL_HOURS
} from "../../config/constants";
import { env } from "../../config/env";
import { userRepository } from "../../repositories/user.repository";
import type { UserRecord } from "../../repositories/user.repository";
import { referralRepository } from "../../repositories/referral.repository";
import { ROLES, USER_STATUS } from "../../types/common";
import { hashPassword, hashToken, verifyPassword } from "../../utils/hash";
import { sendEmail } from "../../utils/email";
import { buildPasswordResetEmail, buildVerificationEmail } from "../../utils/email-templates";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../../utils/jwt";
import type {
  AuthenticatedUser,
  AuthTokens,
  ForgotPasswordInput,
  GoogleLoginInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput
} from "./auth.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

const getFutureDateByDays = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const getFutureDateByHours = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

const createOneTimeToken = (): string => randomBytes(32).toString("hex");

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; verificationRequired: boolean }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw buildServiceError("Email is already registered", StatusCodes.CONFLICT);
    }
    const normalizedReferralCode = input.referralCode?.trim().toUpperCase();
    if (normalizedReferralCode) {
      const referral = await referralRepository.findByCode(normalizedReferralCode);
      if (!referral) {
        throw buildServiceError("Invalid referral code", StatusCodes.BAD_REQUEST);
      }
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.createUser({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: ROLES.MEMBER
    });

    if (normalizedReferralCode) {
      const linked = await referralRepository.attachReferredUser(normalizedReferralCode, user.id);
      if (!linked) {
        throw buildServiceError("Invalid referral code", StatusCodes.BAD_REQUEST);
      }
    }

    await referralRepository.getOrCreateProfile(user.id);

    const verificationToken = createOneTimeToken();
    user.emailVerificationTokenHash = hashToken(verificationToken);
    user.emailVerificationExpiresAt = getFutureDateByHours(
      EMAIL_VERIFICATION_TOKEN_TTL_HOURS
    );
    user.isEmailVerified = false;
    await user.save();

    const link = `${env.CLIENT_ORIGIN}/auth/verify-email?token=${encodeURIComponent(
      verificationToken
    )}`;
    const email = buildVerificationEmail(user.name, link);
    await sendEmail({ to: user.email, subject: email.subject, html: email.html, text: email.text });

    return { user: this.toAuthenticatedUser(user), verificationRequired: true };
  }

  async login(input: LoginInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw buildServiceError("Invalid email or password", StatusCodes.UNAUTHORIZED);
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw buildServiceError("Invalid email or password", StatusCodes.UNAUTHORIZED);
    }

    if (!user.isEmailVerified && user.authProvider === "LOCAL") {
      throw buildServiceError("Email is not verified", StatusCodes.FORBIDDEN);
    }

    if (user.status === USER_STATUS.BANNED) {
      throw buildServiceError("User account is banned", StatusCodes.FORBIDDEN);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw buildServiceError("User account is deleted", StatusCodes.FORBIDDEN);
    }

    return this.issueSessionForUser(user);
  }

  async loginWithGoogle(
    input: GoogleLoginInput
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    let user = await userRepository.findByGoogleId(input.googleId);
    if (!user) {
      user = await userRepository.findByEmail(input.email);
    }

    if (!user) {
      const generatedPasswordHash = await hashPassword(randomBytes(24).toString("hex"));
      user = await userRepository.createUser({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: generatedPasswordHash,
        role: ROLES.MEMBER,
        authProvider: "GOOGLE",
        googleId: input.googleId,
        avatarUrl: input.avatarUrl
      });
    } else {
      user.authProvider = "GOOGLE";
      user.googleId = input.googleId;
      user.avatarUrl = input.avatarUrl;
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;

    if (user.status === USER_STATUS.BANNED) {
      throw buildServiceError("User account is banned", StatusCodes.FORBIDDEN);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw buildServiceError("User account is deleted", StatusCodes.FORBIDDEN);
    }

    return this.issueSessionForUser(user);
  }

  async verifyEmail(input: VerifyEmailInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const tokenHash = hashToken(input.token);
    const matchedUser = await userRepository.findByEmailVerificationToken(tokenHash);
    if (!matchedUser) {
      throw buildServiceError("Verification token is invalid or expired", StatusCodes.UNAUTHORIZED);
    }

    await userRepository.updateEmailVerification(matchedUser.id, {
      tokenHash: null,
      expiresAt: null,
      isEmailVerified: true
    });

    const user = await userRepository.findById(matchedUser.id);
    if (!user) {
      throw buildServiceError("Authenticated user not found", StatusCodes.NOT_FOUND);
    }

    return this.issueSessionForUser(user);
  }

  async resendVerification(input: ResendVerificationInput): Promise<void> {
    try {
      const user = await userRepository.findByEmail(input.email.toLowerCase());
      if (!user || user.isEmailVerified) {
        return;
      }

      const verificationToken = createOneTimeToken();
      await userRepository.updateEmailVerification(user.id, {
        tokenHash: hashToken(verificationToken),
        expiresAt: getFutureDateByHours(EMAIL_VERIFICATION_TOKEN_TTL_HOURS)
      });

      const link = `${env.CLIENT_ORIGIN}/auth/verify-email?token=${encodeURIComponent(
        verificationToken
      )}`;
      const email = buildVerificationEmail(user.name, link);
      void sendEmail({ to: user.email, subject: email.subject, html: email.html, text: email.text }).catch(
        async (err) => {
          try {
            await userRepository.updateEmailVerification(user.id, {
              tokenHash: null,
              expiresAt: null
            });
          } catch (rollbackError) {
            console.error(
              "resend-verification: failed to rollback token after email failure",
              rollbackError
            );
          }

          console.error("resend-verification: email delivery failed", err);
        }
      );
    } catch (err) {
      console.error("resend-verification: unexpected failure", err);
      return;
    }
  }

  async refresh(input: RefreshInput): Promise<AuthTokens> {
    let decoded: ReturnType<typeof verifyRefreshToken>;
    try {
      decoded = verifyRefreshToken(input.refreshToken);
    } catch (_error) {
      throw buildServiceError("Refresh token is invalid or expired", StatusCodes.UNAUTHORIZED);
    }
    const incomingTokenHash = hashToken(input.refreshToken);

    const user = await userRepository.findByIdWithRefreshToken(decoded.userId, incomingTokenHash);
    if (!user) {
      throw buildServiceError("Refresh token is invalid or expired", StatusCodes.UNAUTHORIZED);
    }

    user.refreshTokens = user.refreshTokens.map((token) =>
      token.tokenHash === incomingTokenHash
        ? { ...token, revokedAt: new Date() }
        : token
    );

    const nextTokens = this.createTokenPair(user.id, user.role);
    this.attachHashedRefreshToken(user, nextTokens.refreshToken);
    await user.save();

    return nextTokens;
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    try {
      const user = await userRepository.findByEmail(input.email.toLowerCase());
      if (!user) {
        return;
      }

      const resetToken = createOneTimeToken();
      await userRepository.updatePasswordReset(user.id, {
        tokenHash: hashToken(resetToken),
        expiresAt: getFutureDateByHours(PASSWORD_RESET_TOKEN_TTL_HOURS)
      });

      const link = `${env.CLIENT_ORIGIN}/auth/reset-password?token=${encodeURIComponent(
        resetToken
      )}`;
      const email = buildPasswordResetEmail(user.name, link);
      void sendEmail({ to: user.email, subject: email.subject, html: email.html, text: email.text }).catch(
        async (err) => {
          try {
            await userRepository.updatePasswordReset(user.id, { tokenHash: null, expiresAt: null });
          } catch (rollbackError) {
            console.error(
              "forgot-password: failed to rollback reset token after email failure",
              rollbackError
            );
          }

          console.error("forgot-password: email delivery failed", err);
        }
      );
    } catch (err) {
      console.error("forgot-password: unexpected failure", err);
      return;
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const user = await userRepository.findByPasswordResetToken(tokenHash);
    if (!user) {
      throw buildServiceError("Reset token is invalid or expired", StatusCodes.UNAUTHORIZED);
    }

    const passwordHash = await hashPassword(input.password);
    await userRepository.updatePasswordAndClearTokens(user.id, passwordHash);
  }

  async logout(userId: string, input: LogoutInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      return;
    }

    const targetHash = hashToken(input.refreshToken);
    user.refreshTokens = user.refreshTokens.map((token) =>
      token.tokenHash === targetHash && !token.revokedAt
        ? { ...token, revokedAt: new Date() }
        : token
    );

    await user.save();
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("Authenticated user not found", StatusCodes.NOT_FOUND);
    }

    return this.toAuthenticatedUser(user);
  }

  private async issueSessionForUser(
    user: UserRecord
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    await this.normalizeLegacyUserRole(user);

    const tokens = this.createTokenPair(user.id, user.role);
    this.attachHashedRefreshToken(user, tokens.refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    return { user: this.toAuthenticatedUser(user), tokens };
  }

  private async normalizeLegacyUserRole(user: UserRecord): Promise<void> {
    if (String(user.role) !== "USER") {
      return;
    }

    await userRepository.updateRole(user.id, ROLES.MEMBER);
    user.role = ROLES.MEMBER;
  }

  private createTokenPair(userId: string, role: AuthenticatedUser["role"]): AuthTokens {
    return {
      accessToken: signAccessToken({ userId, role }),
      refreshToken: signRefreshToken({ userId })
    };
  }

  private attachHashedRefreshToken(
    user: UserRecord,
    refreshToken: string
  ): void {
    const now = new Date();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = getFutureDateByDays(env.JWT_REFRESH_EXPIRES_IN_DAYS);

    const activeTokens = user.refreshTokens.filter(
      (token) => !token.revokedAt && token.expiresAt > now
    );

    user.refreshTokens = [
      ...activeTokens,
      {
        tokenHash,
        createdAt: now,
        expiresAt
      }
    ].slice(-10);
  }

  private toAuthenticatedUser(
    user: UserRecord
  ): AuthenticatedUser {
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    };
  }
}

export const authService = new AuthService();
