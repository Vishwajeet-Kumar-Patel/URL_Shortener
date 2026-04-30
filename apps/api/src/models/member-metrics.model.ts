import { model, models, Schema, Types } from "mongoose";

export interface MemberMetricsDocument {
  memberId: Types.ObjectId;
  totalAnonymousUsersBrought: number;
  totalAnonymousLinksGenerated: number;
  totalQualifiedClicks: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  thisMonthUsers: number;
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const memberMetricsSchema = new Schema<MemberMetricsDocument>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    totalAnonymousUsersBrought: { type: Number, default: 0, min: 0 },
    totalAnonymousLinksGenerated: { type: Number, default: 0, min: 0 },
    totalQualifiedClicks: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    thisMonthEarnings: { type: Number, default: 0, min: 0 },
    thisMonthUsers: { type: Number, default: 0, min: 0 },
    lastCalculatedAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true, versionKey: false }
);

memberMetricsSchema.index({ memberId: 1 }, { unique: true, name: "uniq_member_metrics" });
memberMetricsSchema.index(
  { totalEarnings: -1 },
  { name: "idx_member_metrics_earnings" }
);
memberMetricsSchema.index(
  { thisMonthEarnings: -1 },
  { name: "idx_member_metrics_monthly_earnings" }
);

export const MemberMetricsModel =
  models.MemberMetrics || model<MemberMetricsDocument>("MemberMetrics", memberMetricsSchema);
