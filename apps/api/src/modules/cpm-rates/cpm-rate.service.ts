import { cpmRateRepository } from "../../repositories/cpm-rate.repository";
import type { UpsertCpmRateInput } from "./cpm-rate.types";

export class CpmRateService {
  async listAll() {
    const rows = await cpmRateRepository.listAll();
    return rows.map((row) => ({
      id: row.id,
      countryCode: row.countryCode,
      cpm: row.cpm,
      currency: row.currency,
      isActive: row.isActive,
      notes: row.notes,
      updatedAt: row.updatedAt
    }));
  }

  async upsert(input: UpsertCpmRateInput) {
    const row = await cpmRateRepository.upsert(input);
    return {
      id: row.id,
      countryCode: row.countryCode,
      cpm: row.cpm,
      currency: row.currency,
      isActive: row.isActive,
      notes: row.notes,
      updatedAt: row.updatedAt
    };
  }
}

export const cpmRateService = new CpmRateService();
