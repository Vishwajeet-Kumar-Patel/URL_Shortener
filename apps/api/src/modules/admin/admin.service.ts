import { StatusCodes } from "http-status-codes";
import { notificationService } from "../notifications/notification.service";
import { announcementRepository } from "../../repositories/announcement.repository";
import { campaignRepository } from "../../repositories/campaign.repository";
import { invoiceRepository } from "../../repositories/invoice.repository";
import { paymentTransactionRepository } from "../../repositories/payment-transaction.repository";
import { clickRepository } from "../../repositories/click.repository";
import { RedirectSessionModel } from "../../models/redirect-session.model";
import { userRepository } from "../../repositories/user.repository";
import { urlRepository } from "../../repositories/url.repository";
import { referralRepository } from "../../repositories/referral.repository";
import {
  EMAIL_EVENT_TYPE,
  URL_STATUS,
  USER_STATUS,
  type CampaignStatus,
  type Role,
  INVOICE_STATUS
} from "../../types/common";
import type {
  AdminListCampaignsQuery,
  AdminListTransactionsQuery,
  AdminListAnnouncementsQuery,
  AdminCreateAnnouncementInput,
  AdminAttachReferralInput,
  AdminReportsQuery,
  AdminListUrlsQuery,
  AdminListUsersQuery,
  AdminUrlActionResult
} from "./admin.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class AdminService {
  async attachUserToReferral(input: AdminAttachReferralInput): Promise<{
    email: string;
    referralCode: string;
    status: "attached" | "already-attached";
  }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedCode = input.referralCode.trim().toUpperCase();

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw buildServiceError("User not found for the provided email", StatusCodes.NOT_FOUND);
    }

    const referralProfile = await referralRepository.findByCode(normalizedCode);
    if (!referralProfile) {
      throw buildServiceError("Referral code not found", StatusCodes.NOT_FOUND);
    }

    if (String(referralProfile.ownerId) === user.id) {
      throw buildServiceError("User cannot be attached to their own referral code", StatusCodes.BAD_REQUEST);
    }

    const existing = await referralRepository.findByReferredUser(user.id);
    if (existing) {
      if (existing.code === normalizedCode) {
        return { email: normalizedEmail, referralCode: normalizedCode, status: "already-attached" };
      }

      throw buildServiceError(
        `User is already attached to another referral code (${existing.code})`,
        StatusCodes.CONFLICT
      );
    }

    const linked = await referralRepository.attachReferredUser(normalizedCode, user.id);
    if (!linked) {
      throw buildServiceError("Unable to attach user to referral code", StatusCodes.CONFLICT);
    }

    return { email: normalizedEmail, referralCode: normalizedCode, status: "attached" };
  }

  async listUsers(query: AdminListUsersQuery): Promise<{
    items: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      isEmailVerified: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await userRepository.listUsers(query);
    return {
      items: data.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async banUser(actorUserId: string, userId: string): Promise<{ id: string; status: string }> {
    if (actorUserId === userId) {
      throw buildServiceError("You cannot ban your own account", StatusCodes.BAD_REQUEST);
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }
    const updated = await userRepository.updateStatus(userId, USER_STATUS.BANNED);
    if (!updated) {
      throw buildServiceError("Unable to ban user", StatusCodes.INTERNAL_SERVER_ERROR);
    }
    return { id: updated.id, status: updated.status };
  }

  async deleteUser(actorUserId: string, userId: string): Promise<{ id: string; status: string }> {
    if (actorUserId === userId) {
      throw buildServiceError("You cannot delete your own account", StatusCodes.BAD_REQUEST);
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }
    const updated = await userRepository.updateStatus(userId, USER_STATUS.DELETED);
    if (!updated) {
      throw buildServiceError("Unable to delete user", StatusCodes.INTERNAL_SERVER_ERROR);
    }
    return { id: updated.id, status: updated.status };
  }

  async getUserById(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const user = await userRepository.findById(userId);
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async updateUserRole(actorUserId: string, userId: string, role: Role): Promise<{ id: string; role: string }> {
    if (actorUserId === userId) {
      throw buildServiceError("You cannot change your own role", StatusCodes.BAD_REQUEST);
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    const updated = await userRepository.updateRole(userId, role);
    if (!updated) {
      throw buildServiceError("Unable to update user role", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return { id: updated.id, role: updated.role };
  }

  async updateUserStatus(
    actorUserId: string,
    userId: string,
    status: (typeof USER_STATUS)[keyof typeof USER_STATUS]
  ): Promise<{ id: string; status: string }> {
    if (
      actorUserId === userId &&
      (status === USER_STATUS.BANNED || status === USER_STATUS.DELETED)
    ) {
      throw buildServiceError("You cannot set your own account to this status", StatusCodes.BAD_REQUEST);
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    const updated = await userRepository.updateStatus(userId, status);
    if (!updated) {
      throw buildServiceError("Unable to update user status", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return { id: updated.id, status: updated.status };
  }

  async verifyUserEmail(userId: string): Promise<{ id: string; isEmailVerified: boolean }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw buildServiceError("User not found", StatusCodes.NOT_FOUND);
    }

    const updated = await userRepository.updateEmailVerification(userId, {
      tokenHash: null,
      expiresAt: null,
      isEmailVerified: true
    });

    if (!updated) {
      throw buildServiceError("Unable to verify user email", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return { id: updated.id, isEmailVerified: updated.isEmailVerified };
  }

  async listUrls(query: AdminListUrlsQuery): Promise<{
    items: Array<{
      id: string;
      ownerId: string;
      shortCode: string;
      originalUrl: string;
      status: string;
      clickCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await urlRepository.listAllWithFilters(query);
    return {
      items: data.map((url) => ({
        id: url.id,
        ownerId: String(url.ownerId),
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        status: url.status,
        clickCount: url.clickCount,
        createdAt: url.createdAt,
        updatedAt: url.updatedAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async pauseUrl(urlId: string): Promise<AdminUrlActionResult> {
    return this.changeUrlStatus(urlId, URL_STATUS.PAUSED);
  }

  async activateUrl(urlId: string): Promise<AdminUrlActionResult> {
    return this.changeUrlStatus(urlId, URL_STATUS.ACTIVE);
  }

  async deleteUrl(urlId: string): Promise<AdminUrlActionResult> {
    return this.changeUrlStatus(urlId, URL_STATUS.DELETED);
  }

  async listCampaigns(query: AdminListCampaignsQuery): Promise<{
    items: Array<{
      id: string;
      ownerId: string;
      name: string;
      type: string;
      status: string;
      budgetTotal: number;
      budgetSpent: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await campaignRepository.listAll(query);
    return {
      items: data.map((campaign) => ({
        id: campaign.id,
        ownerId: String(campaign.ownerId),
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        budgetTotal: campaign.budgetTotal,
        budgetSpent: campaign.budgetSpent,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async getCampaign(campaignId: string): Promise<{
    id: string;
    ownerId: string;
    name: string;
    type: string;
    status: string;
    budgetTotal: number;
    budgetSpent: number;
    landingUrl?: string;
    creativeTitle?: string;
    creativeBody?: string;
    creativeCta?: string;
    creativeImageUrl?: string;
    creativeVideoUrl?: string;
    targetDevice: string;
    targetCountries?: string[];
    targetExcludeCountries?: string[];
    targetBrowsers?: string[];
    targetOs?: string[];
    targetLanguages?: string[];
    createdAt: Date;
    updatedAt: Date;
  }> {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) {
      throw buildServiceError("Campaign not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: campaign.id,
      ownerId: String(campaign.ownerId),
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      budgetTotal: campaign.budgetTotal,
      budgetSpent: campaign.budgetSpent,
      landingUrl: campaign.landingUrl,
      creativeTitle: campaign.creativeTitle,
      creativeBody: campaign.creativeBody,
      creativeCta: campaign.creativeCta,
      creativeImageUrl: campaign.creativeImageUrl,
      creativeVideoUrl: campaign.creativeVideoUrl,
      targetDevice: campaign.targetDevice,
      targetCountries: campaign.targetCountries,
      targetExcludeCountries: campaign.targetExcludeCountries,
      targetBrowsers: campaign.targetBrowsers,
      targetOs: campaign.targetOs,
      targetLanguages: campaign.targetLanguages,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    };
  }

  async updateCampaignStatus(
    campaignId: string,
    status: CampaignStatus,
    moderatorId: string,
    moderationNote?: string
  ): Promise<{ id: string; status: string }> {
    const updated = await campaignRepository.updateStatusById(campaignId, status, {
      moderationNote,
      moderatedBy: moderatorId,
      moderatedAt: new Date()
    });
    if (!updated) {
      throw buildServiceError("Campaign not found", StatusCodes.NOT_FOUND);
    }

    return { id: updated.id, status: updated.status };
  }

  async listTransactions(query: AdminListTransactionsQuery): Promise<{
    items: Array<{
      id: string;
      invoiceId?: string;
      provider: string;
      eventType: string;
      receivedAt: Date;
      createdAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await paymentTransactionRepository.listAll({
      page: query.page,
      limit: query.limit,
      provider: query.provider as never
    });
    return {
      items: data.map((tx) => ({
        id: tx.id,
        invoiceId: tx.invoiceId ? String(tx.invoiceId) : undefined,
        provider: tx.provider,
        eventType: tx.eventType,
        receivedAt: tx.receivedAt,
        createdAt: tx.createdAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async reports(query: AdminReportsQuery): Promise<{
    periodDays: number;
    users: { total: number; active: number; banned: number };
    urls: { total: number; active: number; paused: number; deleted: number };
    clicks: { total: number; unique: number };
    invoices: { total: number; paid: number; pending: number };
    revenue: { grossCollected: number };
    anonymousSessions?: number;
  }> {
    const [users, urls, clicksTotal, clicksUnique, invoices] = await Promise.all([
      userRepository.listUsers({ page: 1, limit: 1_000_000 }),
      urlRepository.listAllWithFilters({ page: 1, limit: 1_000_000 }),
      clickRepository.countClicksTotal(),
      clickRepository.countUniqueClicksTotal(),
      invoiceRepository.listAll({ page: 1, limit: 1_000_000 })
    ]);

    // count anonymous redirect sessions for admin overview
    const anonymousSessionsCount = await RedirectSessionModel.countDocuments({ anonymousSessionId: { $exists: true } });

    const paid = invoices.data.filter((inv) => inv.status === INVOICE_STATUS.PAID);
    const pending = invoices.data.filter((inv) => inv.status === INVOICE_STATUS.PENDING);
    const grossCollected = paid.reduce((sum, inv) => sum + inv.amount, 0);

    return {
      periodDays: query.days,
      users: {
        total: users.total,
        active: users.data.filter((u) => u.status === USER_STATUS.ACTIVE).length,
        banned: users.data.filter((u) => u.status === USER_STATUS.BANNED).length
      },
      urls: {
        total: urls.total,
        active: urls.data.filter((u) => u.status === URL_STATUS.ACTIVE).length,
        paused: urls.data.filter((u) => u.status === URL_STATUS.PAUSED).length,
        deleted: urls.data.filter((u) => u.status === URL_STATUS.DELETED).length
      },
      clicks: {
        total: clicksTotal,
        unique: clicksUnique
      },
      invoices: {
        total: invoices.total,
        paid: paid.length,
        pending: pending.length
      },
      revenue: {
        grossCollected
      },
      anonymousSessions: anonymousSessionsCount
    };
  }

  async listAnnouncements(query: AdminListAnnouncementsQuery): Promise<{
    items: Array<{
      id: string;
      title: string;
      body: string;
      audience: string;
      status: string;
      sentAt?: Date;
      stats: {
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
      };
      createdAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await announcementRepository.list(query);
    return {
      items: data.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        audience: row.audience,
        status: row.status,
        sentAt: row.sentAt,
        stats: row.stats,
        createdAt: row.createdAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async createAnnouncement(
    adminUserId: string,
    input: AdminCreateAnnouncementInput
  ): Promise<{
    id: string;
    status: string;
    stats: { totalRecipients: number; sentCount: number; failedCount: number };
  }> {
    const created = await announcementRepository.create({
      title: input.title,
      body: input.body,
      audience: input.audience,
      createdBy: adminUserId
    });
    if (!created) {
      throw buildServiceError("Unable to create announcement", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const delivery = await notificationService.enqueueAdminAnnouncement({
      announcementId: created.id,
      audience: input.audience,
      activeOnly: input.activeOnly,
      maxRetries: input.maxRetries
    });
    const status = "DRAFT";
    await announcementRepository.markDelivery(created.id, {
      status,
      totalRecipients: delivery.totalRecipients,
      sentCount: 0,
      failedCount: 0
    });

    return {
      id: created.id,
      status,
      stats: { totalRecipients: delivery.totalRecipients, sentCount: 0, failedCount: 0 }
    };
  }

  private async changeUrlStatus(urlId: string, targetStatus: typeof URL_STATUS[keyof typeof URL_STATUS]) {
    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw buildServiceError("URL not found", StatusCodes.NOT_FOUND);
    }

    const owner = await userRepository.findById(String(url.ownerId));
    if (!owner) {
      throw buildServiceError("URL owner not found", StatusCodes.NOT_FOUND);
    }

    if (url.status === URL_STATUS.DELETED && targetStatus !== URL_STATUS.DELETED) {
      throw buildServiceError("Deleted URLs cannot be modified", StatusCodes.BAD_REQUEST);
    }

    const updated =
      url.status === targetStatus ? url : await urlRepository.updateStatus(url.id, targetStatus);
    if (!updated) {
      throw buildServiceError("Unable to update URL status", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const eventType =
      targetStatus === URL_STATUS.PAUSED
        ? EMAIL_EVENT_TYPE.URL_PAUSED
        : targetStatus === URL_STATUS.ACTIVE
          ? EMAIL_EVENT_TYPE.URL_ACTIVATED
          : EMAIL_EVENT_TYPE.URL_DELETED;

    await notificationService.notifyUrlStatusChange({
      userId: owner.id,
      recipientEmail: owner.email,
      recipientName: owner.name,
      shortCode: updated.shortCode,
      originalUrl: updated.originalUrl,
      eventType,
      status: updated.status
    });

    return {
      id: updated.id,
      shortCode: updated.shortCode,
      ownerId: owner.id,
      ownerEmail: owner.email,
      status: updated.status,
      clickCount: updated.clickCount,
      updatedAt: updated.updatedAt
    };
  }
}

export const adminService = new AdminService();
