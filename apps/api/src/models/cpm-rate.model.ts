import { model, models, Schema } from "mongoose";

export interface CpmRateDocument {
  countryCode: string;
  cpm: number;
  currency: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cpmRateSchema = new Schema<CpmRateDocument>(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true, maxlength: 3, unique: true },
    cpm: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, maxlength: 8, default: "USD" },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true, versionKey: false }
);

cpmRateSchema.index({ countryCode: 1 }, { unique: true, name: "uniq_cpm_country_code" });

export const CpmRateModel = models.CpmRate || model<CpmRateDocument>("CpmRate", cpmRateSchema);
