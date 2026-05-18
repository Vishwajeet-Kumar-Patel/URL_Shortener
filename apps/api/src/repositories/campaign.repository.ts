import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { CAMPAIGN_STATUS, type CampaignStatus, type CampaignType, type Role, type TargetDevice } from "../types/common";

export type CampaignRecord = {
  id: string;
  ownerId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  targetDevice: TargetDevice;
  targetCountries: string[];
  targetExcludeCountries: string[];
  targetBrowsers: string[];
  targetOs: string[];
  targetLanguages: string[];
  budgetTotal: number;
  budgetSpent: number;
  landingUrl: string | null;
  creativeTitle: string | null;
  creativeBody: string | null;
  creativeCta: string | null;
  creativeImageUrl: string | null;
  creativeVideoUrl: string | null;
  moderationNote: string | null;
  moderatedAt: Date | null;
  moderatedBy: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdByRole: Role;
  createdAt: Date;
  updatedAt: Date;
};

export class CampaignRepository {
  async createCampaign(input: {
    ownerId: string;
    name: string;
    type: CampaignType;
    targetDevice: TargetDevice;
    targetCountries?: string[];
    targetExcludeCountries?: string[];
    targetBrowsers?: string[];
    targetOs?: string[];
    targetLanguages?: string[];
    budgetTotal: number;
    landingUrl?: string;
    creativeTitle?: string;
    creativeBody?: string;
    creativeCta?: string;
    creativeImageUrl?: string;
    creativeVideoUrl?: string;
    startsAt?: Date;
    endsAt?: Date;
    createdByRole: Role;
  }): Promise<CampaignRecord> {
    return prisma.campaign.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        type: input.type,
        targetDevice: input.targetDevice,
        targetCountries: input.targetCountries ?? [],
        targetExcludeCountries: input.targetExcludeCountries ?? [],
        targetBrowsers: input.targetBrowsers ?? [],
        targetOs: input.targetOs ?? [],
        targetLanguages: input.targetLanguages ?? [],
        budgetTotal: input.budgetTotal,
        landingUrl: input.landingUrl,
        creativeTitle: input.creativeTitle,
        creativeBody: input.creativeBody,
        creativeCta: input.creativeCta,
        creativeImageUrl: input.creativeImageUrl,
        creativeVideoUrl: input.creativeVideoUrl,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        createdByRole: input.createdByRole
      }
    }) as Promise<CampaignRecord>;
  }

  async listByOwner(input: {
    ownerId: string;
    page: number;
    limit: number;
    status?: CampaignStatus;
  }): Promise<{ data: CampaignRecord[]; total: number }> {
    const where: Prisma.CampaignWhereInput = { ownerId: input.ownerId };
    if (input.status) where.status = input.status;

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.campaign.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.campaign.count({ where })
    ]);

    return { data: data as CampaignRecord[], total };
  }

  async findByIdAndOwner(campaignId: string, ownerId: string): Promise<CampaignRecord | null> {
    return (await prisma.campaign.findFirst({ where: { id: campaignId, ownerId } })) as CampaignRecord | null;
  }

  async updateStatus(
    campaignId: string,
    ownerId: string,
    status: CampaignStatus
  ): Promise<CampaignRecord | null> {
    const current = await prisma.campaign.findFirst({ where: { id: campaignId, ownerId } });
    if (!current) return null;
    return (await prisma.campaign.update({ where: { id: campaignId }, data: { status } })) as CampaignRecord;
  }

  async listAll(input: {
    page: number;
    limit: number;
    status?: CampaignStatus;
    ownerId?: string;
    search?: string;
  }): Promise<{ data: CampaignRecord[]; total: number }> {
    const where: Prisma.CampaignWhereInput = {};
    if (input.status) where.status = input.status;
    if (input.ownerId) where.ownerId = input.ownerId;
    if (input.search) {
      where.OR = [{ name: { contains: input.search, mode: "insensitive" } }];
    }

    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      prisma.campaign.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: input.limit }),
      prisma.campaign.count({ where })
    ]);

    return { data: data as CampaignRecord[], total };
  }

  async findById(campaignId: string): Promise<CampaignRecord | null> {
    return (await prisma.campaign.findUnique({ where: { id: campaignId } })) as CampaignRecord | null;
  }

  async updateStatusById(campaignId: string, status: CampaignStatus, input?: {
    moderationNote?: string;
    moderatedBy?: string;
    moderatedAt?: Date;
  }): Promise<CampaignRecord | null> {
    try {
      return (await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status,
          moderationNote: input?.moderationNote,
          moderatedBy: input?.moderatedBy,
          moderatedAt: input?.moderatedAt
        }
      })) as CampaignRecord;
    } catch {
      return null;
    }
  }

  async updateCampaign(
    campaignId: string,
    ownerId: string,
    update: Partial<CampaignRecord>
  ): Promise<CampaignRecord | null> {
    const current = await prisma.campaign.findFirst({ where: { id: campaignId, ownerId } });
    if (!current) return null;
    return (await prisma.campaign.update({ where: { id: campaignId }, data: update as Prisma.CampaignUpdateInput })) as CampaignRecord;
  }

  /** After a paid CAMPAIGN invoice: activate draft campaigns; top up budget on active campaigns. */
  async applyFundingAfterPayment(
    campaignId: string,
    ownerId: string,
    paidAmount: number
  ): Promise<CampaignRecord | null> {
    const existing = await prisma.campaign.findFirst({ where: { id: campaignId, ownerId } });
    if (!existing) return null;

    if (existing.status === CAMPAIGN_STATUS.DRAFT) {
      return (await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CAMPAIGN_STATUS.ACTIVE }
      })) as CampaignRecord;
    }

    if (existing.status === CAMPAIGN_STATUS.ACTIVE && paidAmount > 0) {
      return (await prisma.campaign.update({
        where: { id: campaignId },
        data: { budgetTotal: { increment: paidAmount } }
      })) as CampaignRecord;
    }

    return existing;
  }
}

export const campaignRepository = new CampaignRepository();
