import { model, models, Schema, Types } from "mongoose";

export interface FunnelStepTiming {
  step: number;
  enteredAt: Date;
  validatedAt?: Date;
}

export interface RedirectSessionDocument {
  shortCode: string;
  anonymousSessionId?: Types.ObjectId;
  // Visitor metadata
  ipAddress?: string;
  ipHash?: string;
  fingerprintHash?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  referrer?: string;
  country?: string;
  city?: string;
  jsEnabled?: boolean;
  cookiesEnabled?: boolean;
  startedAt: Date;
  sponsorClickedAt?: Date;
  completedAt?: Date;
  // Link to initial raw click log
  clickLogId?: Types.ObjectId;
  memberId?: Types.ObjectId;
  currentStep: number;
  completedSteps: number[];
  step1CompleteAt?: Date;
  step2CompleteAt?: Date;
  step3CompleteAt?: Date;
  step4CompleteAt?: Date;
  step5CompleteAt?: Date;
  scrollPosition: number;
  maxScrollPosition: number;
  viewportHeight: number;
  hasScrolledEnough: boolean;
  ctaClicked: boolean;
  createdAt: Date;
  expiresAt: Date;
  stepTimings: FunnelStepTiming[];
  isQualified: boolean;
  targetUrl: string;
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
    // Visitor metadata
    ipAddress: { type: String, trim: true },
    ipHash: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    browser: { type: String, trim: true },
    os: { type: String, trim: true },
    deviceType: { type: String, trim: true },
    referrer: { type: String, trim: true },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    jsEnabled: { type: Boolean, default: true },
    cookiesEnabled: { type: Boolean, default: true },
    fingerprintHash: { type: String, trim: true, index: true },
    startedAt: { type: Date, default: () => new Date(), index: true },
    sponsorClickedAt: { type: Date },
    completedAt: { type: Date },
    // initial raw click log id
    clickLogId: { type: Schema.Types.ObjectId, ref: "ClickLog", index: true, sparse: true },
    memberId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    currentStep: { type: Number, required: true, default: 0, min: 0, max: 5 },
    completedSteps: { type: [Number], default: [] },
    step1CompleteAt: { type: Date },
    step2CompleteAt: { type: Date },
    step3CompleteAt: { type: Date },
    step4CompleteAt: { type: Date },
    step5CompleteAt: { type: Date },
    scrollPosition: { type: Number, default: 0, min: 0 },
    maxScrollPosition: { type: Number, default: 0, min: 0 },
    viewportHeight: { type: Number, default: 0, min: 0 },
    hasScrolledEnough: { type: Boolean, default: false },
    ctaClicked: { type: Boolean, default: false },
    stepTimings: { type: [funnelStepTimingSchema], default: [] },
    isQualified: { type: Boolean, default: false, index: true },
    targetUrl: { type: String, required: true, trim: true },
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
