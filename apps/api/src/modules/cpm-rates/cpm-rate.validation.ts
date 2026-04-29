import { z } from "zod";

export const upsertCpmRateSchema = {
  body: z.object({
    countryCode: z.string().trim().min(2).max(3),
    cpm: z.number().min(0),
    currency: z.string().trim().min(3).max(8),
    isActive: z.boolean().optional(),
    notes: z.string().trim().max(500).optional()
  })
};
