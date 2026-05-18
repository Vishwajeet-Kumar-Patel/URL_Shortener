import { StatusCodes } from "http-status-codes";
import { planRepository } from "../../repositories/plan.repository";
import { subscriptionRepository } from "../../repositories/subscription.repository";
import type { SubscriptionSummary } from "./subscription.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class SubscriptionService {
  async getCurrentSubscription(userId: string): Promise<SubscriptionSummary | null> {
    const active = await subscriptionRepository.findActiveByUser(userId);
    if (!active) return null;

    const plan = await planRepository.findById(String(active.planId));
    if (!plan) {
      throw buildServiceError("Plan not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: active.id,
      planId: plan.id,
      planName: plan.name,
      interval: plan.interval,
      status: active.status,
      startsAt: active.startsAt,
      endsAt: active.endsAt ?? undefined,
      renewAt: active.renewAt ?? undefined
    };
  }

  async getPlanForUser(userId: string) {
    const active = await subscriptionRepository.findActiveByUser(userId);
    if (active) {
      const plan = await planRepository.findById(String(active.planId));
      if (plan) return plan;
    }

    return planRepository.findDefault();
  }
}

export const subscriptionService = new SubscriptionService();
