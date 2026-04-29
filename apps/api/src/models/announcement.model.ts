import { model, models, Schema, Types } from "mongoose";
import { ROLES, type Role } from "../types/common";

export interface AnnouncementDocument {
  title: string;
  body: string;
  audience: "ALL" | Role;
  status: "DRAFT" | "SENT" | "FAILED";
  sentAt?: Date;
  createdBy: Types.ObjectId;
  stats: {
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<AnnouncementDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    body: { type: String, required: true, trim: true, maxlength: 10000 },
    audience: { type: String, required: true, enum: ["ALL", ...Object.values(ROLES)] },
    status: { type: String, required: true, enum: ["DRAFT", "SENT", "FAILED"], default: "DRAFT" },
    sentAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stats: {
      totalRecipients: { type: Number, default: 0, min: 0 },
      sentCount: { type: Number, default: 0, min: 0 },
      failedCount: { type: Number, default: 0, min: 0 }
    }
  },
  { timestamps: true, versionKey: false }
);

announcementSchema.index({ createdAt: -1 }, { name: "idx_announcement_created" });

export const AnnouncementModel =
  models.Announcement || model<AnnouncementDocument>("Announcement", announcementSchema);
