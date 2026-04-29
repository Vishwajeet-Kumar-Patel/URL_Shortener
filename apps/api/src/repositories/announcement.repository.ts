import { HydratedDocument, isValidObjectId } from "mongoose";
import { AnnouncementModel, type AnnouncementDocument } from "../models/announcement.model";
import type { Role } from "../types/common";

type AnnouncementEntity = HydratedDocument<AnnouncementDocument>;

export class AnnouncementRepository {
  async create(input: {
    title: string;
    body: string;
    audience: "ALL" | Role;
    createdBy: string;
  }): Promise<AnnouncementEntity | null> {
    if (!isValidObjectId(input.createdBy)) return null;
    return AnnouncementModel.create({
      title: input.title,
      body: input.body,
      audience: input.audience,
      createdBy: input.createdBy
    });
  }

  async getById(id: string): Promise<AnnouncementEntity | null> {
    if (!isValidObjectId(id)) return null;
    return AnnouncementModel.findById(id).exec();
  }

  async markDelivery(
    id: string,
    input: {
      status: "DRAFT" | "SENT" | "FAILED";
      sentAt?: Date;
      totalRecipients: number;
      sentCount: number;
      failedCount: number;
    }
  ): Promise<void> {
    if (!isValidObjectId(id)) return;
    await AnnouncementModel.updateOne(
      { _id: id },
      {
        $set: {
          status: input.status,
          sentAt: input.sentAt,
          stats: {
            totalRecipients: input.totalRecipients,
            sentCount: input.sentCount,
            failedCount: input.failedCount
          }
        }
      }
    ).exec();
  }

  async list(input: { page: number; limit: number }): Promise<{ data: AnnouncementEntity[]; total: number }> {
    const skip = (input.page - 1) * input.limit;
    const [data, total] = await Promise.all([
      AnnouncementModel.find({}).sort({ createdAt: -1 }).skip(skip).limit(input.limit).exec(),
      AnnouncementModel.countDocuments({})
    ]);
    return { data, total };
  }
}

export const announcementRepository = new AnnouncementRepository();
