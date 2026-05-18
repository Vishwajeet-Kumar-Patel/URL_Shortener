import { StatusCodes } from "http-status-codes";
import { planRepository } from "../../repositories/plan.repository";
import type { CreatePlanInput, PlanListItem, UpdatePlanInput } from "./plan.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class PlanService {
  async listPlans(): Promise<{ items: PlanListItem[] }> {
    const plans = await planRepository.listActive();
    return { items: plans.map((plan) => this.toItem(plan)) };
  }

  async listAllPlansAdmin(): Promise<{ items: PlanListItem[] }> {
    const plans = await planRepository.listAll();
    return { items: plans.map((plan) => this.toItem(plan)) };
  }

  async createPlan(input: CreatePlanInput): Promise<PlanListItem> {
    if (input.isDefault) {
      const existingDefault = await planRepository.findDefault();
      if (existingDefault) {
        await planRepository.updatePlan(existingDefault.id, { isDefault: false });
      }
    }

    const created = await planRepository.createPlan({
      name: input.name,
      description: input.description,
      price: input.price,
      currency: input.currency,
      interval: input.interval,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
      limits: input.limits
    } as never);

    return this.toItem(created);
  }

  async updatePlan(planId: string, input: UpdatePlanInput): Promise<PlanListItem> {
    if (input.isDefault) {
      const existingDefault = await planRepository.findDefault();
      if (existingDefault && existingDefault.id !== planId) {
        await planRepository.updatePlan(existingDefault.id, { isDefault: false });
      }
    }

    const updated = await planRepository.updatePlan(planId, input as never);
    if (!updated) {
      throw buildServiceError("Plan not found", StatusCodes.NOT_FOUND);
    }

    return this.toItem(updated);
  }

  private toItem(plan: Awaited<ReturnType<typeof planRepository.findById>>): PlanListItem {
    if (!plan) {
      throw buildServiceError("Plan not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description ?? undefined,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      limits: plan.limits
    };
  }
}

export const planService = new PlanService();
