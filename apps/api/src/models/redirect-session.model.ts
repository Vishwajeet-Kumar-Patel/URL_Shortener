import { model, models, Schema, Types } from "mongoose";

export interface FunnelStepTiming {
  step: number;
  enteredAt: Date;
  validatedAt?: Date;
}

export interface RedirectSessionDocument {
  shortCode: string;
  anonymousSessionId?: Types.ObjectId;
  memberId?: Types.ObjectId;
  currentStep: number;
  completedSteps: number[];
  scrollPosition: number;
  maxScrollPosition: number;
  viewportHeight: number;
  hasScrolledEnough: boolean;
  ctaClicked: boolean;
  createdAt: Date;
  expiresAt: Date;
  stepTimings: FunnelStepTiming[];
  isQualified: boolean;
  updatedAt: Date;
}

const funnelStepTimingSchema = new Schema<FunnelStepTiming>(
  {
    step: { type: Number, required: true, min: 1, max: 5 },
    enteredAt: { type: Date, required: true },
    validatedAt: { type: Date }
  },
  { _id: false }
);

const redirectSessionSchema = new Schema<RedirectSessionDocument>(
  {
    shortCode: { type: String, required: true, trim: true, index: true, maxlength: 32 },
    anonymousSessionId: {
      type: Schema.Types.ObjectId,
      ref: "AnonymousSession",
      index: true,
      sparse: true
    },
    memberId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    currentStep: { type: Number, required: true, default: 1, min: 1, max: 5 },
    completedSteps: { type: [Number], default: [] },
    scrollPosition: { type: Number, default: 0, min: 0 },
    maxScrollPosition: { type: Number, default: 0, min: 0 },
    viewportHeight: { type: Number, default: 0, min: 0 },
    hasScrolledEnough: { type: Boolean, default: false },
    ctaClicked: { type: Boolean, default: false },
    stepTimings: { type: [funnelStepTimingSchema], default: [] },
    isQualified: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true, versionKey: false }
);

redirectSessionSchema.index(
  { shortCode: 1, createdAt: -1 },
  { name: "idx_redirect_session_code_created" }
);
redirectSessionSchema.index(
  { anonymousSessionId: 1, createdAt: -1 },
  { name: "idx_redirect_session_anon_created", sparse: true }
);
redirectSessionSchema.index(
  { memberId: 1, isQualified: 1, createdAt: -1 },
  { name: "idx_redirect_session_member_qualified", sparse: true }
);
redirectSessionSchema.index(
  { expiresAt: 1 },
  { name: "idx_redirect_session_expiry", expireAfterSeconds: 0 }
);

export const RedirectSessionModel =
  models.RedirectSession ||
  model<RedirectSessionDocument>("RedirectSession", redirectSessionSchema);
