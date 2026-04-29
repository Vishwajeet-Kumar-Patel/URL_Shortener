import { HydratedDocument } from "mongoose";
import { CpmRateModel, type CpmRateDocument } from "../models/cpm-rate.model";

type CpmRateEntity = HydratedDocument<CpmRateDocument>;

export class CpmRateRepository {
  async listAll(): Promise<CpmRateEntity[]> {
    return CpmRateModel.find({}).sort({ countryCode: 1 }).exec();
  }

  async getByCountryCode(countryCode: string): Promise<CpmRateEntity | null> {
    return CpmRateModel.findOne({ countryCode: countryCode.trim().toUpperCase() }).exec();
  }

  async upsert(input: {
    countryCode: string;
    cpm: number;
    currency: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<CpmRateEntity> {
    return (await CpmRateModel.findOneAndUpdate(
      { countryCode: input.countryCode.trim().toUpperCase() },
      {
        $set: {
          cpm: input.cpm,
          currency: input.currency.trim().toUpperCase(),
          isActive: input.isActive ?? true,
          notes: input.notes
        },
        $setOnInsert: {
          countryCode: input.countryCode.trim().toUpperCase()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec()) as CpmRateEntity;
  }

  async getApplicableRate(countryCode?: string): Promise<CpmRateEntity | null> {
    const normalized = countryCode?.trim().toUpperCase();
    if (normalized) {
      const exact = await CpmRateModel.findOne({ countryCode: normalized, isActive: true }).exec();
      if (exact) return exact;
    }
    return CpmRateModel.findOne({ countryCode: "DEFAULT", isActive: true }).exec();
  }
}

export const cpmRateRepository = new CpmRateRepository();
