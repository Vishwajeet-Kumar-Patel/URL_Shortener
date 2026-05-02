// filepath: apps/api/src/models/revenue-log.model.ts

import { model, models, Schema, Types } from "mongoose";

export interface RevenueLogDocument {
  source:
    | "SUBSCRIPTION"
    | "CPM"
    | "REFERRAL"
    | "ADJUSTMENT"
    | "AD_POPUP_IMPRESSION"
    | "AD_POPUP_CLICK";
  country?: string;
  amount: number;
  currency: string;
  memberId?: Types.ObjectId;
  planId?: Types.ObjectId;
  sessionId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const revenueLogSchema = new Schema<RevenueLogDocument>(
  {
    source: {
      type: String,
      enum: [
        "SUBSCRIPTION",
        "CPM",
        "REFERRAL",
        "ADJUSTMENT",
        "AD_POPUP_IMPRESSION",
        "AD_POPUP_CLICK"
      ],
      required: true,
      index: true
    },
    country: { type: String, trim: true, maxlength: 100, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, maxlength: 8, default: "INR" },
    memberId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    sessionId: { type: Schema.Types.ObjectId, ref: "RedirectSession" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    notes: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true, versionKey: false }
);

// Compound indexes for efficient querying
revenueLogSchema.index(
  { source: 1, createdAt: -1 },
  { name: "idx_revenue_source_date" }
);
revenueLogSchema.index(
  { country: 1, createdAt: -1 },
  { name: "idx_revenue_country_date" }
);
revenueLogSchema.index(
  { createdAt: 1 },
  { name: "idx_revenue_date" }
);

export const RevenueLogModel =
  models.RevenueLog || model<RevenueLogDocument>("RevenueLog", revenueLogSchema);
