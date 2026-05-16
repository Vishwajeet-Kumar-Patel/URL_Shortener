import { randomBytes } from "crypto";
import { StatusCodes } from "http-status-codes";
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from "../../config/constants";
import { env } from "../../config/env";
import { ShortUrlModel } from "../../models/short-url.model";
import { MemberEarningModel } from "../../models/member-earning.model";
import { RedirectSessionModel } from "../../models/redirect-session.model";
import { MemberMetricsModel } from "../../models/member-metrics.model";
import { userRepository } from "../../repositories/user.repository";
import { sendEmail } from "../../utils/email";
import { buildVerificationEmail } from "../../utils/email-templates";
import { hashPassword, hashToken, verifyPassword } from "../../utils/hash";
import type { UpdatePasswordInput, UpdateProfileInput, UserProfile } from "./user.types";
import type { MemberMetricsDocument } from "../../models/member-metrics.model";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

const createOneTimeToken = (): string => randomBytes(32).toString("hex");

const getFutureDateByHours = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

export class UserService {
  async getModuleHealth(): Promise<{ module: string; status: string }> {
    return { module: "users", status: "ready-for-implementation" };
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    return this.toProfile(user);
  }

  async getAnonymousLinks(userId: string): Promise<{
    items: Array<{
      shortCode: string;
      shortUrl: string;
      originalUrl: string;
      createdAt: Date;
      totalClicks: number;
      qualifiedClicks: number;
    }>;
  }> {
    const links = await ShortUrlModel.find({ createdByMemberId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return {
      items: links.map((link) => ({
        shortCode: link.shortCode,
        shortUrl: `${env.APP_PUBLIC_URL}/r/${link.shortCode}`,
        originalUrl: link.originalUrl,
        createdAt: link.createdAt,
        totalClicks: link.rawOpenCount ?? link.clickCount ?? 0,
        qualifiedClicks: link.qualifiedCompletionCount ?? 0
      }))
    };
  }

  async getEarningsSummary(userId: string): Promise<{
    totalEarnings: number;
    thisMonthEarnings: number;
    totalQualifiedClicks: number;
    breakdown: Array<{ country: string; clicks: number; earnings: number }>;
  }> {
    const metrics = (await MemberMetricsModel.findOne({ memberId: userId }).lean()) as
      | MemberMetricsDocument
      | null;
    const earnings = await MemberEarningModel.find({ memberId: userId }).lean();

    const sessions = await RedirectSessionModel.find({
      _id: { $in: earnings.map((entry) => entry.redirectSessionId) }
    })
      .select("country")
      .lean();

    const sessionCountryById = new Map<string, string>();
    sessions.forEach((session) => {
      sessionCountryById.set(String(session._id), session.country || "UNKNOWN");
    });

    const byCountry = new Map<string, { clicks: number; earnings: number }>();
    earnings.forEach((entry) => {
      const country = sessionCountryById.get(String(entry.redirectSessionId)) || "UNKNOWN";
      const current = byCountry.get(country) || { clicks: 0, earnings: 0 };
      current.clicks += 1;
      current.earnings += Number(entry.amount || 0);
      byCountry.set(country, current);
    });

    return {
      totalEarnings: metrics?.totalEarnings ?? 0,
      thisMonthEarnings: metrics?.thisMonthEarnings ?? 0,
      totalQualifiedClicks: metrics?.totalQualifiedClicks ?? earnings.length,
      breakdown: Array.from(byCountry.entries()).map(([country, value]) => ({
        country,
        clicks: value.clicks,
        earnings: Number(value.earnings.toFixed(2))
      }))
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    let user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    const profilePatch: { name?: string; avatarUrl?: string } = {};
    if (input.name !== undefined) {
      profilePatch.name = input.name.trim();
    }
    if (input.avatarUrl !== undefined) {
      profilePatch.avatarUrl = input.avatarUrl.trim();
    }
    if (Object.keys(profilePatch).length > 0) {
      const partial = await userRepository.updateProfile(userId, profilePatch);
      if (!partial) {
        throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
      }
      user = partial;
    }

    const nextEmail = input.email?.trim().toLowerCase();
    const wantsEmailChange =
      nextEmail !== undefined && nextEmail.length > 0 && nextEmail !== user.email.toLowerCase();

    if (!wantsEmailChange) {
      if (Object.keys(profilePatch).length === 0) {
        throw buildServiceError("At least one field must be provided", StatusCodes.BAD_REQUEST);
      }
      return this.toProfile(user);
    }

    if (!input.currentPassword) {
      throw buildServiceError("Current password is required to change email", StatusCodes.BAD_REQUEST);
    }

    const passwordOk = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!passwordOk) {
      throw buildServiceError("Current password is incorrect", StatusCodes.UNAUTHORIZED);
    }

    const taken = await userRepository.findByEmail(nextEmail);
    if (taken && taken.id !== userId) {
      throw buildServiceError("Email is already in use", StatusCodes.CONFLICT);
    }

    const verificationToken = createOneTimeToken();
    const tokenHash = hashToken(verificationToken);
    const expiresAt = getFutureDateByHours(EMAIL_VERIFICATION_TOKEN_TTL_HOURS);
    const snapshot = { email: user.email, isEmailVerified: user.isEmailVerified };

    const updated = await userRepository.updateEmailReverify(
      userId,
      nextEmail,
      tokenHash,
      expiresAt,
      false
    );
    if (!updated) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    const link = `${env.CLIENT_ORIGIN}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;
    const mail = buildVerificationEmail(updated.name, link);
    try {
      await sendEmail({ to: nextEmail, subject: mail.subject, html: mail.html, text: mail.text });
    } catch (err) {
      await userRepository.revertEmailSnapshot(userId, snapshot);
      console.error("profile email change: verification email failed", err);
      throw buildServiceError(
        "We could not send a verification email. Your email was not changed. Check SMTP settings or try again later.",
        StatusCodes.BAD_GATEWAY
      );
    }

    return this.toProfile(updated);
  }

  async updatePassword(userId: string, input: UpdatePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    const matches = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw buildServiceError("Current password is incorrect", StatusCodes.UNAUTHORIZED);
    }

    const nextHash = await hashPassword(input.newPassword);
    await userRepository.updatePassword(userId, nextHash);
  }

  private toProfile(user: Awaited<ReturnType<typeof userRepository.findById>>): UserProfile {
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export const userService = new UserService();
