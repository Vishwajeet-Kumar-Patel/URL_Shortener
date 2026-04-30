import { HydratedDocument } from "mongoose";
import { ClickLogModel, type ClickLogDocument } from "../models/click-log.model";

type ClickLogEntity = HydratedDocument<ClickLogDocument>;

export class ClickRepository {
  async createClickLog(payload: Partial<ClickLogDocument>): Promise<ClickLogEntity> {
    return ClickLogModel.create(payload);
  }

  async markClickQualified(clickId: string): Promise<void> {
    await ClickLogModel.findByIdAndUpdate(clickId, { isQualified: true }).exec();
  }

  async countClicksByOwner(ownerId: string): Promise<number> {
    return ClickLogModel.countDocuments({ ownerId, isQualified: true }).exec();
  }

  async countClicksByUrl(urlId: string): Promise<number> {
    return ClickLogModel.countDocuments({ urlId, isQualified: true }).exec();
  }

  async countUniqueClicksByOwner(ownerId: string): Promise<number> {
    return ClickLogModel.countDocuments({ ownerId, isUnique: true, isQualified: true }).exec();
  }

  async countUniqueClicksByUrl(urlId: string): Promise<number> {
    return ClickLogModel.countDocuments({ urlId, isUnique: true, isQualified: true }).exec();
  }

  async countClicksTotal(): Promise<number> {
    return ClickLogModel.countDocuments({ isQualified: true }).exec();
  }

  async countUniqueClicksTotal(): Promise<number> {
    return ClickLogModel.countDocuments({ isUnique: true, isQualified: true }).exec();
  }

  async existsRecentUniqueClick(input: {
    shortCode: string;
    ipHash: string;
    since: Date;
  }): Promise<boolean> {
    const existing = await ClickLogModel.exists({
      shortCode: input.shortCode,
      ipHash: input.ipHash,
      isQualified: true,
      timestamp: { $gte: input.since }
    });
    return Boolean(existing);
  }

  async getDailyClicks(input: {
    ownerId?: string;
    urlId?: string;
    days: number;
    uniqueOnly?: boolean;
  }): Promise<Array<{ date: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.max(1, input.days));

    const match: Record<string, unknown> = { timestamp: { $gte: startDate } };
    match.isQualified = true;
    if (input.ownerId) {
      match.ownerId = input.ownerId;
    }
    if (input.urlId) {
      match.urlId = input.urlId;
    }
    if (input.uniqueOnly) {
      match.isUnique = true;
    }

    const rows = await ClickLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    return rows.map((row) => ({
      date: `${row._id.year}-${String(row._id.month).padStart(2, "0")}-${String(row._id.day).padStart(2, "0")}`,
      count: row.count as number
    }));
  }

  async getTopLinks(input: {
    ownerId?: string;
    days: number;
    limit: number;
  }): Promise<
    Array<{
      urlId: string;
      shortCode: string;
      totalClicks: number;
      uniqueClicks: number;
      originalUrl?: string;
      title?: string;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.max(1, input.days));

    const match: Record<string, unknown> = { timestamp: { $gte: startDate } };
    match.isQualified = true;
    if (input.ownerId) {
      match.ownerId = input.ownerId;
    }

    const rows = await ClickLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { urlId: "$urlId", shortCode: "$shortCode" },
          totalClicks: { $sum: 1 },
          uniqueClicks: {
            $sum: {
              $cond: [{ $eq: ["$isUnique", true] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalClicks: -1 } },
      { $limit: input.limit },
      {
        $lookup: {
          from: "shorturls",
          localField: "_id.urlId",
          foreignField: "_id",
          as: "urlDoc"
        }
      },
      { $unwind: { path: "$urlDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          urlId: "$_id.urlId",
          shortCode: "$_id.shortCode",
          totalClicks: 1,
          uniqueClicks: 1,
          originalUrl: "$urlDoc.originalUrl",
          title: "$urlDoc.title"
        }
      }
    ]);

    return rows.map((row) => ({
      urlId: String(row.urlId),
      shortCode: row.shortCode as string,
      totalClicks: row.totalClicks as number,
      uniqueClicks: row.uniqueClicks as number,
      originalUrl: row.originalUrl as string | undefined,
      title: row.title as string | undefined
    }));
  }

  async getFieldBreakdown(input: {
    ownerId?: string;
    urlId?: string;
    days: number;
    field: "browser" | "os" | "deviceType" | "country" | "referrer";
    limit: number;
  }): Promise<Array<{ label: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.max(1, input.days));

    const match: Record<string, unknown> = { timestamp: { $gte: startDate } };
    match.isQualified = true;
    if (input.ownerId) {
      match.ownerId = input.ownerId;
    }
    if (input.urlId) {
      match.urlId = input.urlId;
    }

    const rows = await ClickLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: [`$${input.field}`, "Unknown"] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: input.limit }
    ]);

    return rows.map((row) => ({
      label: String(row._id ?? "Unknown"),
      count: row.count as number
    }));
  }

  async getPeriodClicks(input: {
    ownerId?: string;
    period: "monthly" | "yearly";
    months?: number;
    years?: number;
    year?: number;
    uniqueOnly?: boolean;
  }): Promise<Array<{ period: string; count: number }>> {
    const now = new Date();
    let startDate = new Date();

    if (input.period === "monthly") {
      if (input.year) {
        startDate = new Date(input.year, 0, 1);
      } else {
        const months = Math.max(1, input.months ?? 12);
        startDate.setMonth(startDate.getMonth() - months);
      }
    } else {
      const years = Math.max(1, input.years ?? 5);
      startDate.setFullYear(startDate.getFullYear() - years);
    }

    const match: Record<string, unknown> = { timestamp: { $gte: startDate, $lte: now } };
    match.isQualified = true;
    if (input.ownerId) {
      match.ownerId = input.ownerId;
    }
    if (input.uniqueOnly) {
      match.isUnique = true;
    }
    if (input.period === "monthly" && input.year) {
      match.timestamp = {
        $gte: new Date(input.year, 0, 1),
        $lte: new Date(input.year, 11, 31, 23, 59, 59)
      };
    }

    const groupId =
      input.period === "monthly"
        ? {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" }
          }
        : { year: { $year: "$timestamp" } };

    const rows = await ClickLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    return rows.map((row) => {
      const year = row._id.year as number;
      const month = row._id.month as number | undefined;
      return {
        period: month ? `${year}-${String(month).padStart(2, "0")}` : String(year),
        count: row.count as number
      };
    });
  }
}

export const clickRepository = new ClickRepository();
