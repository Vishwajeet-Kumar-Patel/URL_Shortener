import { model, models, Schema, Types } from "mongoose";

export interface ReferralDocument {
  ownerId: Types.ObjectId;
  code: string;
  referredUserIds: Types.ObjectId[];
  totalReferred: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<ReferralDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 24 },
    referredUserIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    totalReferred: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

referralSchema.index({ code: 1 }, { unique: true, name: "uniq_referral_code" });
referralSchema.index({ referredUserIds: 1 }, { name: "idx_referral_referred_user" });

export const ReferralModel = models.Referral || model<ReferralDocument>("Referral", referralSchema);
