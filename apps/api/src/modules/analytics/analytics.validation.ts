import { z } from "zod";

export const analyticsOverviewQuerySchema = {
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(30)
  })
};

export const analyticsTopLinksQuerySchema = {
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
    limit: z.coerce.number().int().min(1).max(100).default(10)
  })
};

export const analyticsLinkParamsSchema = {
  params: z.object({
    id: z.string().trim().min(1)
  })
};

export const analyticsLinkQuerySchema = {
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(30)
  })
};

export const analyticsExportQuerySchema = {
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
    type: z.enum(["clicks", "unique"]).default("clicks")
  })
};

export const analyticsPresetQuerySchema = {
  query: z.object({
    period: z.enum(["monthly", "yearly"]).default("monthly"),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    months: z.coerce.number().int().min(1).max(60).optional(),
    years: z.coerce.number().int().min(1).max(20).optional()
  })
};
