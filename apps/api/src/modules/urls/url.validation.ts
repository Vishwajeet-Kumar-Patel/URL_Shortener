import { z } from "zod";
import { URL_AD_MODE, URL_STATUS } from "../../types/common";

const aliasRegex = /^[a-zA-Z0-9_-]{5,32}$/;

export const createUrlSchema = {
  body: z.object({
    originalUrl: z.string().trim().min(1).max(2048),
    customAlias: z.string().trim().regex(aliasRegex).optional(),
    adMode: z.enum(Object.values(URL_AD_MODE) as [string, ...string[]]).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(1000).optional(),
    expiresAt: z.string().datetime().optional(),
    // Referral tracking fields
    referralCode: z.string().trim().min(1).max(255).optional(),
    createdByMemberId: z.string().trim().min(1).optional(),
    anonSessionId: z.string().trim().min(1).optional()
  })
};

export const updateUrlSchema = {
  body: z
    .object({
      originalUrl: z.string().trim().min(1).max(2048).optional(),
      adMode: z.enum(Object.values(URL_AD_MODE) as [string, ...string[]]).optional(),
      title: z.string().trim().min(1).max(255).optional(),
      description: z.string().trim().min(1).max(1000).optional(),
      expiresAt: z.string().datetime().nullable().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided"
    })
};

export const listUrlsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(Object.values(URL_STATUS) as [string, ...string[]]).optional(),
    search: z.string().trim().max(200).optional()
  })
};

export const getMyUrlByIdSchema = {
  params: z.object({
    id: z.string().trim().min(1)
  })
};

export const urlIdParamsSchema = {
  params: z.object({
    id: z.string().trim().min(1)
  })
};
