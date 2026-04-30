import { model, models, Schema, Types } from "mongoose";

export interface AnonymousSessionDocument {
  memberId?: Types.ObjectId;
  referralCode?: string;
  sessionToken: string;
  userAgent: string;
  ipHash: string;
  isValid: boolean;
  createdAt: Date;
  expiresAt: Date;
  updatedAt: Date;
}

const anonymousSessionSchema = new Schema<AnonymousSessionDocument>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    referralCode: { type: String, trim: true, uppercase: true, maxlength: 24, sparse: true },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      minlength: 32,
      maxlength: 255
    },
    userAgent: { type: String, required: true, trim: true, maxlength: 512 },
    ipHash: { type: String, required: true, trim: true, maxlength: 255, index: true },
    isValid: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true, versionKey: false }
);

anonymousSessionSchema.index(
  { sessionToken: 1, expiresAt: 1 },
  { name: "idx_anon_session_token_expiry" }
);
anonymousSessionSchema.index(
  { memberId: 1, createdAt: -1 },
  { name: "idx_anon_session_member_created", sparse: true }
);
anonymousSessionSchema.index(
  { ipHash: 1, createdAt: -1 },
  { name: "idx_anon_session_ip_created" }
);
anonymousSessionSchema.index(
  { expiresAt: 1 },
  { name: "idx_anon_session_expiry", expireAfterSeconds: 0 }
);

export const AnonymousSessionModel =
  models.AnonymousSession ||
  model<AnonymousSessionDocument>("AnonymousSession", anonymousSessionSchema);
