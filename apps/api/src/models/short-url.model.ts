import { model, models, Schema, Types } from "mongoose";
import {
  ROLES,
  URL_AD_MODE,
  URL_STATUS,
  type Role,
  type UrlAdMode,
  type UrlStatus
} from "../types/common";

export interface ShortUrlDocument {
  ownerId: Types.ObjectId;
  shortCode: string;
  originalUrl: string;
  normalizedUrl: string;
  adMode: UrlAdMode;
  isCustomAlias: boolean;
  status: UrlStatus;
  title?: string;
  description?: string;
  clickCount: number;
  lastClickedAt?: Date;
  expiresAt?: Date;
  createdByRole: Role;
  createdByMemberId?: Types.ObjectId;
  anonymousSessionId?: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const shortUrlSchema = new Schema<ShortUrlDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 5,
      maxlength: 32
    },
    originalUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    normalizedUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    status: {
      type: String,
      enum: Object.values(URL_STATUS),
      default: URL_STATUS.ACTIVE,
      required: true,
      index: true
    },
    adMode: {
      type: String,
      enum: Object.values(URL_AD_MODE),
      default: URL_AD_MODE.DIRECT,
      required: true
    },
    isCustomAlias: { type: Boolean, default: false },
    title: { type: String, trim: true, maxlength: 255 },
    description: { type: String, trim: true, maxlength: 1000 },
    clickCount: { type: Number, default: 0, min: 0 },
    lastClickedAt: { type: Date },
    expiresAt: { type: Date },
    createdByRole: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.MEMBER
    },
    createdByMemberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      sparse: true
    },
    anonymousSessionId: {
      type: Schema.Types.ObjectId,
      ref: "AnonymousSession",
      index: true,
      sparse: true
    },
    deletedAt: { type: Date }
  },
  { timestamps: true, versionKey: false }
);

shortUrlSchema.index({ shortCode: 1 }, { unique: true, name: "uniq_short_url_code" });
shortUrlSchema.index({ ownerId: 1, createdAt: -1 }, { name: "idx_short_url_owner_created_at" });
shortUrlSchema.index({ status: 1 }, { name: "idx_short_url_status" });
shortUrlSchema.index(
  { createdByMemberId: 1, createdAt: -1 },
  { name: "idx_short_url_member_created_at", sparse: true }
);

export const ShortUrlModel =
  models.ShortUrl || model<ShortUrlDocument>("ShortUrl", shortUrlSchema);
