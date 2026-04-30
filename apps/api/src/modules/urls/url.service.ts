import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { urlRepository } from "../../repositories/url.repository";
import { subscriptionService } from "../subscriptions/subscription.service";
import { URL_AD_MODE, URL_STATUS, type UrlStatus } from "../../types/common";
import { generateShortCode } from "../../utils/nanoid";
import { isValidPublicUrl, normalizeUrl } from "../../utils/url";
import type {
  CreateShortUrlInput,
  ListUserUrlsQuery,
  UpdateShortUrlInput,
  UrlListItem
} from "./url.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

type ShortUrlEntity = Awaited<ReturnType<typeof urlRepository.findByShortCode>>;

export class UrlService {
  // Create a public/anonymous short URL. Uses a placeholder owner id so
  // the existing data model (ownerId required) remains satisfied.
  async createPublicUrl(
    input: CreateShortUrlInput,
    options?: { anonSessionId?: string; createdByMemberId?: string }
  ): Promise<UrlListItem> {
    const normalizedUrl = normalizeUrl(input.originalUrl);
    if (!isValidPublicUrl(normalizedUrl)) {
      throw buildServiceError("Please provide a valid public URL", StatusCodes.BAD_REQUEST);
    }

    const shortCode = input.customAlias ? await this.reserveCustomAlias(input.customAlias) : await this.generateUniqueShortCode();

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw buildServiceError("Invalid expiry date", StatusCodes.BAD_REQUEST);
    }

    // Use the configured anonymous owner id so anonymous links have an owner placeholder.
    const ANON_OWNER_ID = env.APP_ANON_OWNER_ID;

    const creationData: Record<string, unknown> = {
      ownerId: ANON_OWNER_ID,
      shortCode,
      originalUrl: input.originalUrl.trim(),
      normalizedUrl,
      adMode: input.adMode ?? URL_AD_MODE.MONETIZED,
      isCustomAlias: Boolean(input.customAlias),
      title: input.title,
      description: input.description,
      expiresAt
    };

    // Add referral attribution if provided
    if (options?.createdByMemberId) {
      creationData.createdByMemberId = options.createdByMemberId;
    }

    if (options?.anonSessionId) {
      creationData.anonymousSessionId = options.anonSessionId;
    }

    const created = await urlRepository.createOne(creationData as Parameters<typeof urlRepository.createOne>[0]);

    return this.toUrlListItem(created);
  }
  async createUrl(userId: string, input: CreateShortUrlInput): Promise<UrlListItem> {
    const plan = await subscriptionService.getPlanForUser(userId);
    if (plan && plan.limits.maxLinks > 0) {
      const currentCount = await urlRepository.countByOwner(userId);
      if (currentCount >= plan.limits.maxLinks) {
        throw buildServiceError("Plan link limit reached", StatusCodes.FORBIDDEN);
      }
    }

    if (input.customAlias && plan && !plan.limits.customAlias) {
      throw buildServiceError("Custom alias is not available on your plan", StatusCodes.FORBIDDEN);
    }

    const normalizedUrl = normalizeUrl(input.originalUrl);
    if (!isValidPublicUrl(normalizedUrl)) {
      throw buildServiceError("Please provide a valid public URL", StatusCodes.BAD_REQUEST);
    }

    const shortCode = input.customAlias
      ? await this.reserveCustomAlias(input.customAlias)
      : await this.generateUniqueShortCode();

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw buildServiceError("Invalid expiry date", StatusCodes.BAD_REQUEST);
    }

    const created = await urlRepository.createOne({
      ownerId: userId,
      shortCode,
      originalUrl: input.originalUrl.trim(),
      normalizedUrl,
      adMode: input.adMode ?? URL_AD_MODE.DIRECT,
      isCustomAlias: Boolean(input.customAlias),
      title: input.title,
      description: input.description,
      expiresAt
    });

    return this.toUrlListItem(created);
  }

  async listOwnUrls(
    userId: string,
    query: ListUserUrlsQuery
  ): Promise<{
    items: UrlListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    filters: { status?: string; search?: string };
  }> {
    const { data, total } = await urlRepository.findByOwnerWithFilters({
      ownerId: userId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search
    });

    return {
      items: data.map((item) => this.toUrlListItem(item)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      },
      filters: {
        status: query.status,
        search: query.search
      }
    };
  }

  async getOwnUrlById(userId: string, urlId: string): Promise<UrlListItem> {
    const url = await urlRepository.findByIdAndOwner(urlId, userId);
    if (!url) {
      throw buildServiceError("URL not found", StatusCodes.NOT_FOUND);
    }

    return this.toUrlListItem(url);
  }

  async updateOwnUrl(
    userId: string,
    urlId: string,
    input: UpdateShortUrlInput
  ): Promise<UrlListItem> {
    const update: Record<string, unknown> = {};

    if (input.originalUrl) {
      const normalizedUrl = normalizeUrl(input.originalUrl);
      if (!isValidPublicUrl(normalizedUrl)) {
        throw buildServiceError("Please provide a valid public URL", StatusCodes.BAD_REQUEST);
      }
      update.originalUrl = input.originalUrl.trim();
      update.normalizedUrl = normalizedUrl;
    }

    if (input.adMode) {
      update.adMode = input.adMode;
    }

    if (input.title !== undefined) {
      update.title = input.title;
    }
    if (input.description !== undefined) {
      update.description = input.description;
    }
    if (input.expiresAt !== undefined) {
      update.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }

    const updated = await urlRepository.updateByOwner(urlId, userId, update);
    if (!updated) {
      throw buildServiceError("URL not found", StatusCodes.NOT_FOUND);
    }

    return this.toUrlListItem(updated);
  }

  async changeOwnUrlStatus(userId: string, urlId: string, status: UrlStatus): Promise<UrlListItem> {
    const existing = await urlRepository.findByIdAndOwner(urlId, userId);
    if (!existing) {
      throw buildServiceError("URL not found", StatusCodes.NOT_FOUND);
    }

    if (existing.status === URL_STATUS.DELETED) {
      throw buildServiceError("Deleted URLs cannot be modified", StatusCodes.BAD_REQUEST);
    }

    const updated = await urlRepository.updateByOwner(urlId, userId, { status });
    if (!updated) {
      throw buildServiceError("Unable to update URL status", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return this.toUrlListItem(updated);
  }

  async deleteOwnUrl(userId: string, urlId: string): Promise<void> {
    const existing = await urlRepository.findByIdAndOwner(urlId, userId);
    if (!existing) {
      throw buildServiceError("URL not found", StatusCodes.NOT_FOUND);
    }

    await urlRepository.updateByOwner(urlId, userId, { status: URL_STATUS.DELETED, deletedAt: new Date() });
  }

  private async generateUniqueShortCode(): Promise<string> {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const candidate = generateShortCode();
      const exists = await urlRepository.existsByShortCode(candidate);
      if (!exists) {
        return candidate;
      }
    }

    throw buildServiceError(
      "Unable to generate unique short code. Please retry.",
      StatusCodes.SERVICE_UNAVAILABLE
    );
  }

  private toUrlListItem(
    doc: NonNullable<ShortUrlEntity>
  ): UrlListItem {
    return {
      id: doc.id,
      shortCode: doc.shortCode,
      shortUrl: `${env.APP_PUBLIC_URL}/r/${doc.shortCode}`,
      originalUrl: doc.originalUrl,
      normalizedUrl: doc.normalizedUrl,
      adMode: doc.adMode ?? URL_AD_MODE.DIRECT,
      isCustomAlias: doc.isCustomAlias ?? false,
      status: doc.status ?? URL_STATUS.ACTIVE,
      clickCount: doc.clickCount,
      title: doc.title,
      description: doc.description,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  private async reserveCustomAlias(alias: string): Promise<string> {
    const trimmed = alias.trim();
    const exists = await urlRepository.existsByShortCode(trimmed);
    if (exists) {
      throw buildServiceError("Custom alias is already in use", StatusCodes.CONFLICT);
    }

    return trimmed;
  }
}

export const urlService = new UrlService();
