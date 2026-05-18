import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { PlanInterval } from "../types/common";

export type PlanLimits = {
  maxLinks: number;
  analyticsAccess: boolean;
  customAlias: boolean;
  campaignAccess: boolean;
  payoutLimit: number;
};

const defaultPlanLimits: PlanLimits = {
  maxLinks: 0,
  analyticsAccess: false,
  customAlias: false,
  campaignAccess: false,
  payoutLimit: 0
};

const normalizePlanLimits = (value: Prisma.JsonValue): PlanLimits => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultPlanLimits;
  }

  const limits = value as Record<string, unknown>;
  return {
    maxLinks: Number(limits.maxLinks ?? defaultPlanLimits.maxLinks),
    analyticsAccess: Boolean(limits.analyticsAccess ?? defaultPlanLimits.analyticsAccess),
    customAlias: Boolean(limits.customAlias ?? defaultPlanLimits.customAlias),
    campaignAccess: Boolean(limits.campaignAccess ?? defaultPlanLimits.campaignAccess),
    payoutLimit: Number(limits.payoutLimit ?? defaultPlanLimits.payoutLimit)
  };
};

export type PlanRecord = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: PlanInterval;
  isActive: boolean;
  isDefault: boolean;
  limits: PlanLimits;
  createdAt: Date;
  updatedAt: Date;
};

const toRecord = (plan: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: PlanInterval;
  isActive: boolean;
  isDefault: boolean;
  limits: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): PlanRecord => ({
  ...plan,
  limits: normalizePlanLimits(plan.limits)
});

export class PlanRepository {
  async listAll(): Promise<PlanRecord[]> {
    const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
    return plans.map(toRecord);
  }

  async listActive(): Promise<PlanRecord[]> {
    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });
    return plans.map(toRecord);
  }

  async findById(planId: string): Promise<PlanRecord | null> {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    return plan ? toRecord(plan) : null;
  }

  async findDefault(): Promise<PlanRecord | null> {
    const plan = await prisma.plan.findFirst({ where: { isDefault: true, isActive: true } });
    return plan ? toRecord(plan) : null;
  }

  async createPlan(input: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    interval: PlanInterval;
    isActive: boolean;
    isDefault: boolean;
    limits: PlanLimits;
  }): Promise<PlanRecord> {
    const created = await prisma.plan.create({
      data: {
        ...input,
        limits: input.limits as Prisma.InputJsonValue
      }
    });
    return toRecord(created);
  }

  async updatePlan(
    planId: string,
    update: Partial<{
      name: string;
      description: string | null;
      price: number;
      currency: string;
      interval: PlanInterval;
      isActive: boolean;
      isDefault: boolean;
      limits: PlanLimits;
    }>
  ): Promise<PlanRecord | null> {
    try {
      const nextUpdate = {
        ...update,
        limits: update.limits ? (update.limits as Prisma.InputJsonValue) : undefined
      };
      const plan = await prisma.plan.update({ where: { id: planId }, data: nextUpdate });
      return toRecord(plan);
    } catch {
      return null;
    }
  }
}

export const planRepository = new PlanRepository();
