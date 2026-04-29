import { model, models, Schema, Types } from "mongoose";

export interface AnnouncementJobDocument {
  announcementId: Types.ObjectId;
  userId: Types.ObjectId;
  email: string;
  attempts: number;
  maxRetries: number;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED";
  nextAttemptAt: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const announcementJobSchema = new Schema<AnnouncementJobDocument>(
  {
    announcementId: { type: Schema.Types.ObjectId, ref: "Announcement", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
    attempts: { type: Number, default: 0, min: 0 },
    maxRetries: { type: Number, default: 2, min: 0, max: 10 },
    status: { type: String, enum: ["PENDING", "PROCESSING", "SENT", "FAILED"], default: "PENDING", index: true },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lastError: { type: String, trim: true, maxlength: 2000 }
  },
  { timestamps: true, versionKey: false }
);

announcementJobSchema.index({ status: 1, nextAttemptAt: 1 }, { name: "idx_announcement_job_queue" });
announcementJobSchema.index({ announcementId: 1, userId: 1 }, { unique: true, name: "uniq_announcement_user_job" });

export const AnnouncementJobModel =
  models.AnnouncementJob || model<AnnouncementJobDocument>("AnnouncementJob", announcementJobSchema);
