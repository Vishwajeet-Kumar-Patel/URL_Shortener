import { HydratedDocument, isValidObjectId, Types } from "mongoose";
import { AnnouncementJobModel, type AnnouncementJobDocument } from "../models/announcement-job.model";

type AnnouncementJobEntity = HydratedDocument<AnnouncementJobDocument>;

export class AnnouncementJobRepository {
  async enqueueMany(input: Array<{ announcementId: string; userId: string; email: string; maxRetries: number }>): Promise<void> {
    const rows = input
      .filter((row) => isValidObjectId(row.announcementId) && isValidObjectId(row.userId))
      .map((row) => ({
        announcementId: new Types.ObjectId(row.announcementId),
        userId: new Types.ObjectId(row.userId),
        email: row.email,
        maxRetries: row.maxRetries,
        attempts: 0,
        status: "PENDING" as const,
        nextAttemptAt: new Date()
      }));
    if (rows.length === 0) return;
    await AnnouncementJobModel.insertMany(rows, { ordered: false }).catch(() => undefined);
  }

  async claimBatch(limit: number): Promise<AnnouncementJobEntity[]> {
    const now = new Date();
    const jobs = await AnnouncementJobModel.find({
      status: "PENDING",
      nextAttemptAt: { $lte: now }
    })
      .sort({ nextAttemptAt: 1 })
      .limit(limit)
      .exec();

    const ids = jobs.map((j) => j._id);
    if (ids.length > 0) {
      await AnnouncementJobModel.updateMany(
        { _id: { $in: ids }, status: "PENDING" },
        { $set: { status: "PROCESSING" } }
      ).exec();
    }

    return AnnouncementJobModel.find({ _id: { $in: ids }, status: "PROCESSING" }).exec();
  }

  async markSent(id: string): Promise<void> {
    if (!isValidObjectId(id)) return;
    await AnnouncementJobModel.updateOne(
      { _id: id },
      {
        $set: {
          status: "SENT",
          nextAttemptAt: new Date()
        }
      }
    ).exec();
  }

  async markFailure(id: string, input: { error: string; nextAttemptAt: Date; final: boolean }): Promise<void> {
    if (!isValidObjectId(id)) return;
    await AnnouncementJobModel.updateOne(
      { _id: id },
      {
        $inc: { attempts: 1 },
        $set: {
          status: input.final ? "FAILED" : "PENDING",
          lastError: input.error,
          nextAttemptAt: input.nextAttemptAt
        }
      }
    ).exec();
  }

  async getStatsByAnnouncement(announcementId: string): Promise<{ total: number; sent: number; failed: number }> {
    if (!isValidObjectId(announcementId)) return { total: 0, sent: 0, failed: 0 };
    const [total, sent, failed] = await Promise.all([
      AnnouncementJobModel.countDocuments({ announcementId }),
      AnnouncementJobModel.countDocuments({ announcementId, status: "SENT" }),
      AnnouncementJobModel.countDocuments({ announcementId, status: "FAILED" })
    ]);
    return { total, sent, failed };
  }

  async countPendingByAnnouncement(announcementId: string): Promise<number> {
    if (!isValidObjectId(announcementId)) return 0;
    return AnnouncementJobModel.countDocuments({
      announcementId,
      status: { $in: ["PENDING", "PROCESSING"] }
    });
  }
}

export const announcementJobRepository = new AnnouncementJobRepository();
