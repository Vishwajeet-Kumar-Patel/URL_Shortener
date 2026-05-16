import { model, models, Schema, Types } from "mongoose";
import {
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  ROLES,
  TARGET_DEVICE,
  type CampaignStatus,
  type CampaignType,
  type Role,
  type TargetDevice
} from "../types/common";

export interface CampaignDocument {
  ownerId: Types.ObjectId | string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  targetDevice: TargetDevice;
  targetCountries?: string[];
  targetExcludeCountries?: string[];
  targetBrowsers?: string[];
  targetOs?: string[];
  targetLanguages?: string[];
  budgetTotal: number;
  budgetSpent: number;
  landingUrl?: string;
  creativeTitle?: string;
  creativeBody?: string;
  creativeCta?: string;
  creativeImageUrl?: string;
  creativeVideoUrl?: string;
  moderationNote?: string;
  moderatedAt?: Date;
  moderatedBy?: Types.ObjectId;
  startsAt?: Date;
  endsAt?: Date;
  createdByRole: Role;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<CampaignDocument>(
  {
    ownerId: { type: Schema.Types.Mixed, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: Object.values(CAMPAIGN_TYPE), required: true },
    status: {
      type: String,
      enum: Object.values(CAMPAIGN_STATUS),
      default: CAMPAIGN_STATUS.DRAFT,
      required: true
    },
    targetDevice: {
      type: String,
      enum: Object.values(TARGET_DEVICE),
      default: TARGET_DEVICE.ALL,
      required: true
    },
    targetCountries: { type: [String], default: [] },
    targetExcludeCountries: { type: [String], default: [] },
    targetBrowsers: { type: [String], default: [] },
    targetOs: { type: [String], default: [] },
    targetLanguages: { type: [String], default: [] },
    budgetTotal: { type: Number, required: true, min: 0 },
    budgetSpent: { type: Number, default: 0, min: 0 },
    landingUrl: { type: String, trim: true, maxlength: 2048 },
    creativeTitle: { type: String, trim: true, maxlength: 140 },
    creativeBody: { type: String, trim: true, maxlength: 500 },
    creativeCta: { type: String, trim: true, maxlength: 80 },
    creativeImageUrl: { type: String, trim: true, maxlength: 2048 },
    creativeVideoUrl: { type: String, trim: true, maxlength: 2048 },
    moderationNote: { type: String, trim: true, maxlength: 500 },
    moderatedAt: { type: Date },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    startsAt: { type: Date },
    endsAt: { type: Date },
    createdByRole: {
      type: String,
      enum: Object.values(ROLES),
      required: true
    }
  },
  { timestamps: true, versionKey: false }
);

campaignSchema.index({ ownerId: 1, createdAt: -1 }, { name: "idx_campaign_owner_created_at" });
campaignSchema.index({ status: 1, type: 1 }, { name: "idx_campaign_status_type" });

export const CampaignModel =
  models.Campaign || model<CampaignDocument>("Campaign", campaignSchema);
