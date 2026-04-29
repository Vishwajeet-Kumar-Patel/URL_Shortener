import { UNIQUE_CLICK_WINDOW_HOURS } from "../../config/constants";
import { clickRepository } from "../../repositories/click.repository";
import { cpmRateRepository } from "../../repositories/cpm-rate.repository";
import { urlRepository } from "../../repositories/url.repository";
import { WALLET_TX_SOURCE } from "../../types/common";
import { walletService } from "../wallet/wallet.service";
import { URL_STATUS } from "../../types/common";
import type { RedirectResolution } from "./redirect.types";

type ResolveInput = {
  shortCode: string;
  ipAddress: string;
  ipHash: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
  referrer?: string;
  country?: string;
  city?: string;
};

export class RedirectService {
  async inspectShortCode(shortCode: string): Promise<RedirectResolution> {
    const url = await urlRepository.findByShortCode(shortCode);
    if (!url) {
      return {
        outcome: "NOT_FOUND",
        message: "This short link does not exist."
      };
    }

    if (url.status === URL_STATUS.DELETED) {
      return {
        outcome: "DELETED",
        message: "This short link has been deleted by its owner."
      };
    }

    if (url.status === URL_STATUS.HIDDEN) {
      return {
        outcome: "HIDDEN",
        message: "This short link is hidden by its owner."
      };
    }

    if (url.status === URL_STATUS.PAUSED) {
      return {
        outcome: "PAUSED",
        message: "This short link has been paused by the owner or admin."
      };
    }

    return {
      outcome: "ACTIVE",
      targetUrl: url.normalizedUrl,
      urlId: String(url._id),
      ownerId: String(url.ownerId),
      shortCode: url.shortCode
    };
  }

  async recordClick(
    input: ResolveInput & {
      urlId: string;
      ownerId: string;
      jsEnabled: boolean;
      cookiesEnabled: boolean;
      isBot: boolean;
      isSuspicious: boolean;
      isQualified: boolean;
      qualificationReason: string;
    }
  ): Promise<{ isUnique: boolean; isQualified: boolean; clickLogId: string }> {
    let finalQualified = input.isQualified;

    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - UNIQUE_CLICK_WINDOW_HOURS);
    const alreadyCounted = await clickRepository.existsRecentUniqueClick({
      shortCode: input.shortCode,
      ipHash: input.ipHash,
      since: windowStart
    });
    const isUnique = !alreadyCounted;
    if (!isUnique && finalQualified) {
      finalQualified = false;
    }
    if (finalQualified) {
      await urlRepository.incrementClickForActiveShortCode(input.shortCode);
    }

    const click = await clickRepository.createClickLog({
      urlId: input.urlId as never,
      shortCode: input.shortCode,
      ownerId: input.ownerId as never,
      timestamp: new Date(),
      ipAddress: input.ipAddress,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      browser: input.browser,
      os: input.os,
      deviceType: input.deviceType,
      referrer: input.referrer,
      country: input.country,
      city: input.city,
      isUnique,
      jsEnabled: input.jsEnabled,
      cookiesEnabled: input.cookiesEnabled,
      isBot: input.isBot,
      isSuspicious: input.isSuspicious,
      isQualified: finalQualified,
      qualificationReason: !finalQualified && !isUnique ? "duplicate_ip_within_24h" : input.qualificationReason
    });

    return { isUnique, isQualified: finalQualified, clickLogId: click.id };
  }

  async creditQualifiedPayout(input: {
    ownerId: string;
    country?: string;
    shortCode: string;
    clickLogId: string;
  }): Promise<{ amount: number; currency: string } | null> {
    const rate = await cpmRateRepository.getApplicableRate(input.country);
    if (!rate || rate.cpm <= 0) return null;
    const amount = Number((rate.cpm / 1000).toFixed(6));
    if (amount <= 0) return null;
    await walletService.credit(
      input.ownerId,
      amount,
      WALLET_TX_SOURCE.EARNING,
      `click:${input.clickLogId}`,
      `Qualified click payout (${rate.countryCode} CPM ${rate.cpm})`
    );
    return { amount, currency: rate.currency };
  }

  async resolveShortCode(input: ResolveInput): Promise<RedirectResolution> {
    const inspected = await this.inspectShortCode(input.shortCode);
    if (inspected.outcome !== "ACTIVE") {
      return inspected;
    }

    await this.recordClick({
      ...input,
      urlId: inspected.urlId,
      ownerId: inspected.ownerId,
      jsEnabled: false,
      cookiesEnabled: false,
      isBot: false,
      isSuspicious: true,
      isQualified: false,
      qualificationReason: "direct_redirect_without_session"
    });

    return inspected;
  }

  async resolveShortCodeLegacy(input: ResolveInput): Promise<RedirectResolution> {
    const url = await urlRepository.findByShortCode(input.shortCode);
    if (!url) {
      return {
        outcome: "NOT_FOUND",
        message: "This short link does not exist."
      };
    }

    if (url.status === URL_STATUS.DELETED) {
      return {
        outcome: "DELETED",
        message: "This short link has been deleted by its owner."
      };
    }

    if (url.status === URL_STATUS.HIDDEN) {
      return {
        outcome: "HIDDEN",
        message: "This short link is hidden by its owner."
      };
    }

    if (url.status === URL_STATUS.PAUSED) {
      return {
        outcome: "PAUSED",
        message: "This short link has been paused by the owner or admin."
      };
    }

    const updatedUrl = await urlRepository.incrementClickForActiveShortCode(input.shortCode);
    if (!updatedUrl) {
      return {
        outcome: "PAUSED",
        message: "This short link is currently unavailable."
      };
    }

    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - UNIQUE_CLICK_WINDOW_HOURS);
    const alreadyCounted = await clickRepository.existsRecentUniqueClick({
      shortCode: updatedUrl.shortCode,
      ipHash: input.ipHash,
      since: windowStart
    });
    const isUnique = !alreadyCounted;

    await clickRepository.createClickLog({
      urlId: updatedUrl._id,
      shortCode: updatedUrl.shortCode,
      ownerId: updatedUrl.ownerId,
      timestamp: new Date(),
      ipAddress: input.ipAddress,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      browser: input.browser,
      os: input.os,
      deviceType: input.deviceType,
      referrer: input.referrer,
      country: input.country,
      city: input.city,
      isUnique
    });

    return {
      outcome: "ACTIVE",
      targetUrl: updatedUrl.normalizedUrl,
      urlId: String(updatedUrl._id),
      ownerId: String(updatedUrl.ownerId),
      shortCode: updatedUrl.shortCode
    };
  }
}

export const redirectService = new RedirectService();
