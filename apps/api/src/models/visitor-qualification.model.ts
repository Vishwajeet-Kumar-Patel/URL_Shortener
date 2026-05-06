import { model, models, Schema, Types } from "mongoose";

export interface VisitorQualificationDocument {
  ipHash: string;
  fingerprintHash?: string;
  shortCode: string;
  redirectSessionId: Types.ObjectId;
  memberId?: Types.ObjectId;
  firstCompletedAt: Date;
  expiresAt: Date;
  isDuplicate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const visitorQualificationSchema = new Schema<VisitorQualificationDocument>(
  {
    ipHash: { type: String, required: true, trim: true, index: true },
    fingerprintHash: { type: String, trim: true, index: true },
    shortCode: { type: String, required: true, trim: true, index: true },
    redirectSessionId: { type: Schema.Types.ObjectId, ref: "RedirectSession", required: true, index: true, unique: true },
    memberId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    firstCompletedAt: { type: Date, required: true, default: () => new Date(), index: true },
    expiresAt: { type: Date, required: true, index: true },
    isDuplicate: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, versionKey: false }
);

visitorQualificationSchema.index({ ipHash: 1, expiresAt: -1 }, { name: "idx_visitor_qualification_ip_expiry" });
visitorQualificationSchema.index({ fingerprintHash: 1, expiresAt: -1 }, { name: "idx_visitor_qualification_fingerprint_expiry", sparse: true });
visitorQualificationSchema.index({ shortCode: 1, expiresAt: -1 }, { name: "idx_visitor_qualification_shortcode_expiry" });

export const VisitorQualificationModel =
  models.VisitorQualification || model<VisitorQualificationDocument>("VisitorQualification", visitorQualificationSchema);
