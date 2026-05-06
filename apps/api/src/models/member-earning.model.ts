import { model, models, Schema, Types } from "mongoose";

export interface MemberEarningDocument {
  memberId: Types.ObjectId;
  shortLinkId: Types.ObjectId;
  redirectSessionId: Types.ObjectId;
  amount: number;
  visitorIpHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const memberEarningSchema = new Schema<MemberEarningDocument>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    shortLinkId: { type: Schema.Types.ObjectId, ref: "ShortUrl", required: true, index: true },
    redirectSessionId: { type: Schema.Types.ObjectId, ref: "RedirectSession", required: true, unique: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    visitorIpHash: { type: String, required: true, trim: true, index: true }
  },
  { timestamps: true, versionKey: false }
);

memberEarningSchema.index({ memberId: 1, createdAt: -1 }, { name: "idx_member_earning_member_time" });
memberEarningSchema.index({ shortLinkId: 1, createdAt: -1 }, { name: "idx_member_earning_link_time" });

export const MemberEarningModel =
  models.MemberEarning || model<MemberEarningDocument>("MemberEarning", memberEarningSchema);
