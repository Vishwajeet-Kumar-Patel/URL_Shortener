import { StatusCodes } from "http-status-codes";
import { campaignRepository } from "../../repositories/campaign.repository";
import { CAMPAIGN_STATUS, type CampaignStatus, type Role } from "../../types/common";
import type {
  CampaignListItem,
  CreateCampaignInput,
  ListCampaignsQuery,
  UpdateCampaignInput
} from "./campaign.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class CampaignService {
  async createCampaign(
    userId: string,
    role: Role,
    input: CreateCampaignInput
  ): Promise<CampaignListItem> {
    const startsAt = input.startsAt ? new Date(input.startsAt) : undefined;
    const endsAt = input.endsAt ? new Date(input.endsAt) : undefined;
    if (startsAt && Number.isNaN(startsAt.getTime())) {
      throw buildServiceError("Invalid campaign start date", StatusCodes.BAD_REQUEST);
    }
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      throw buildServiceError("Invalid campaign end date", StatusCodes.BAD_REQUEST);
    }

    const created = await campaignRepository.createCampaign({
      ownerId: userId,
      name: input.name,
      type: input.type,
      targetDevice: input.targetDevice,
      targetCountries: input.targetCountries,
      targetExcludeCountries: input.targetExcludeCountries,
      targetBrowsers: input.targetBrowsers,
      targetOs: input.targetOs,
      targetLanguages: input.targetLanguages,
      budgetTotal: input.budgetTotal,
      landingUrl: input.landingUrl,
      creativeTitle: input.creativeTitle,
      creativeBody: input.creativeBody,
      creativeCta: input.creativeCta,
      creativeImageUrl: input.creativeImageUrl,
      creativeVideoUrl: input.creativeVideoUrl,
      startsAt,
      endsAt,
      createdByRole: role
    });

    return this.toListItem(created);
  }

  async listOwnCampaigns(
    userId: string,
    query: ListCampaignsQuery
  ): Promise<{
    items: CampaignListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await campaignRepository.listByOwner({
      ownerId: userId,
      page: query.page,
      limit: query.limit,
      status: query.status
    });

    return {
      items: data.map((campaign) => this.toListItem(campaign)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async getOwnCampaign(userId: string, campaignId: string): Promise<CampaignListItem> {
    const campaign = await campaignRepository.findByIdAndOwner(campaignId, userId);
    if (!campaign) {
      throw buildServiceError("Campaign not found", StatusCodes.NOT_FOUND);
    }

    return this.toListItem(campaign);
  }

  async updateOwnCampaign(
    userId: string,
    campaignId: string,
    input: UpdateCampaignInput
  ): Promise<CampaignListItem> {
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.targetDevice !== undefined) update.targetDevice = input.targetDevice;
    if (input.targetCountries !== undefined) update.targetCountries = input.targetCountries;
    if (input.targetExcludeCountries !== undefined) update.targetExcludeCountries = input.targetExcludeCountries;
    if (input.targetBrowsers !== undefined) update.targetBrowsers = input.targetBrowsers;
    if (input.targetOs !== undefined) update.targetOs = input.targetOs;
    if (input.targetLanguages !== undefined) update.targetLanguages = input.targetLanguages;
    if (input.budgetTotal !== undefined) update.budgetTotal = input.budgetTotal;
    if (input.landingUrl !== undefined) update.landingUrl = input.landingUrl;
    if (input.creativeTitle !== undefined) update.creativeTitle = input.creativeTitle;
    if (input.creativeBody !== undefined) update.creativeBody = input.creativeBody;
    if (input.creativeCta !== undefined) update.creativeCta = input.creativeCta;
    if (input.creativeImageUrl !== undefined) update.creativeImageUrl = input.creativeImageUrl;
    if (input.creativeVideoUrl !== undefined) update.creativeVideoUrl = input.creativeVideoUrl;
    if (input.startsAt !== undefined) update.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined) update.endsAt = input.endsAt ? new Date(input.endsAt) : null;

    const updated = await campaignRepository.updateCampaign(campaignId, userId, update);
    if (!updated) {
      throw buildServiceError("Campaign not found", StatusCodes.NOT_FOUND);
    }

    return this.toListItem(updated);
  }

  async pauseCampaign(userId: string, campaignId: string): Promise<CampaignListItem> {
    return this.changeStatus(userId, campaignId, CAMPAIGN_STATUS.PAUSED);
  }

  async resumeCampaign(userId: string, campaignId: string): Promise<CampaignListItem> {
    return this.changeStatus(userId, campaignId, CAMPAIGN_STATUS.ACTIVE);
  }

  private async changeStatus(
    userId: string,
    campaignId: string,
    status: CampaignStatus
  ): Promise<CampaignListItem> {
    const updated = await campaignRepository.updateStatus(campaignId, userId, status);
    if (!updated) {
      throw buildServiceError("Campaign not found", StatusCodes.NOT_FOUND);
    }

    return this.toListItem(updated);
  }

  private toListItem(campaign: Awaited<ReturnType<typeof campaignRepository.findByIdAndOwner>>): CampaignListItem {
    if (!campaign) {
      throw buildServiceError("Campaign not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      targetDevice: campaign.targetDevice,
      targetCountries: campaign.targetCountries,
      targetExcludeCountries: campaign.targetExcludeCountries,
      targetBrowsers: campaign.targetBrowsers,
      targetOs: campaign.targetOs,
      targetLanguages: campaign.targetLanguages,
      budgetTotal: campaign.budgetTotal,
      budgetSpent: campaign.budgetSpent,
      landingUrl: campaign.landingUrl ?? undefined,
      creativeTitle: campaign.creativeTitle ?? undefined,
      creativeBody: campaign.creativeBody ?? undefined,
      creativeCta: campaign.creativeCta ?? undefined,
      creativeImageUrl: campaign.creativeImageUrl ?? undefined,
      creativeVideoUrl: campaign.creativeVideoUrl ?? undefined,
      startsAt: campaign.startsAt ?? undefined,
      endsAt: campaign.endsAt ?? undefined,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    };
  }
}

export const campaignService = new CampaignService();
