import { model, models, Schema, Types } from "mongoose";

export interface ReferralEarningDocument {
  referrerId: Types.ObjectId;
  referredUserId: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  amount: number;
  grossAmount: number;
  ratePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const referralEarningSchema = new Schema<ReferralEarningDocument>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true },
    amount: { type: Number, required: true, min: 0 },
    grossAmount: { type: Number, required: true, min: 0 },
    ratePercent: { type: Number, required: true, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

referralEarningSchema.index({ referrerId: 1, createdAt: -1 }, { name: "idx_referral_earning_referrer_time" });

export const ReferralEarningModel =
  models.ReferralEarning || model<ReferralEarningDocument>("ReferralEarning", referralEarningSchema);
