import { model, models, Schema, Types } from "mongoose";

export interface ClickLogDocument {
  urlId: Types.ObjectId;
  shortCode: string;
  ownerId: Types.ObjectId;
  timestamp: Date;
  ipAddress: string;
  ipHash?: string;
  userAgent: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  referrer?: string;
  country?: string;
  city?: string;
  isUnique?: boolean;
  jsEnabled?: boolean;
  cookiesEnabled?: boolean;
  isBot?: boolean;
  isSuspicious?: boolean;
  isQualified?: boolean;
  qualificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clickLogSchema = new Schema<ClickLogDocument>(
  {
    urlId: { type: Schema.Types.ObjectId, ref: "ShortUrl", required: true, index: true },
    shortCode: { type: String, required: true, trim: true, index: true, maxlength: 32 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    ipAddress: { type: String, required: true, trim: true, maxlength: 128 },
    ipHash: { type: String, trim: true, index: true },
    userAgent: { type: String, required: true, trim: true, maxlength: 1024 },
    browser: { type: String, trim: true, maxlength: 128 },
    os: { type: String, trim: true, maxlength: 128 },
    deviceType: { type: String, trim: true, maxlength: 64 },
    referrer: { type: String, trim: true, maxlength: 2048 },
    country: { type: String, trim: true, maxlength: 128 },
    city: { type: String, trim: true, maxlength: 128 },
    isUnique: { type: Boolean, default: false },
    jsEnabled: { type: Boolean, default: false },
    cookiesEnabled: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false },
    isSuspicious: { type: Boolean, default: false },
    isQualified: { type: Boolean, default: false, index: true },
    qualificationReason: { type: String, trim: true, maxlength: 120 }
  },
  { timestamps: true, versionKey: false }
);

clickLogSchema.index({ urlId: 1, timestamp: -1 }, { name: "idx_click_log_url_time" });
clickLogSchema.index({ ownerId: 1, timestamp: -1 }, { name: "idx_click_log_owner_time" });
clickLogSchema.index({ shortCode: 1, timestamp: -1 }, { name: "idx_click_log_code_time" });
clickLogSchema.index({ shortCode: 1, ipHash: 1, timestamp: -1 }, { name: "idx_click_log_unique" });
clickLogSchema.index({ ownerId: 1, isUnique: 1, timestamp: -1 }, { name: "idx_click_log_owner_unique" });
clickLogSchema.index({ ownerId: 1, isQualified: 1, timestamp: -1 }, { name: "idx_click_log_owner_qualified" });

export const ClickLogModel =
  models.ClickLog || model<ClickLogDocument>("ClickLog", clickLogSchema);
