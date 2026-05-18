import { StatusCodes } from "http-status-codes";
import { redirectSessionRepository, type FunnelStepTiming } from "../../repositories/redirect-session.repository";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class FunnelValidationService {
  async validateAndAdvanceStep(
    sessionId: string,
    currentStep: number,
    input: {
      scrollPosition?: number;
      maxScrollPosition?: number;
      viewportHeight?: number;
      ctaClicked?: boolean;
      hasScrolledEnough?: boolean;
    }
  ): Promise<{
    isValid: boolean;
    nextStep: number;
    message?: string;
  }> {
    const session = await redirectSessionRepository.findById(sessionId);
    if (!session) {
      throw buildServiceError("Session not found", StatusCodes.NOT_FOUND);
    }

    // Allow idempotent/duplicate validations: if the session has already
    // progressed past the requested step, return success rather than
    // throwing a mismatch. This handles client retries or racey events.
    if (session.currentStep !== currentStep) {
      if (session.currentStep >= currentStep + 1) {
        return {
          isValid: true,
          nextStep: Math.min(session.currentStep, 5),
          message: "Step already completed"
        };
      }
      throw buildServiceError("Invalid session or step mismatch", StatusCodes.BAD_REQUEST);
    }

    const nextStep = currentStep + 1;
    const maxSteps = 5;
    const now = new Date();
    const REQUIRED_WAIT = 9.5;

    switch (currentStep) {
      case 0: {
        const startedAt = session.startedAt ?? session.createdAt;
        const secondsElapsed = (now.getTime() - startedAt.getTime()) / 1000;
        if (secondsElapsed < 14.5) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(14.5 - secondsElapsed)} more seconds`
          };
        }
        break;
      }

      case 1: {
        const stepTimings = (Array.isArray(session.stepTimings) ? session.stepTimings : []) as FunnelStepTiming[];
        const timing = stepTimings.find((step) => step.step === currentStep);
        const secondsElapsed = timing ? (now.getTime() - timing.enteredAt.getTime()) / 1000 : 0;
        if (secondsElapsed < REQUIRED_WAIT) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(REQUIRED_WAIT - secondsElapsed)} more seconds`
          };
        }
        await redirectSessionRepository.markStepComplete(sessionId, 1);
        break;
      }

      case 2: {
        const stepTimings = (Array.isArray(session.stepTimings) ? session.stepTimings : []) as FunnelStepTiming[];
        const timing = stepTimings.find((step) => step.step === currentStep);
        const secondsElapsed = timing ? (now.getTime() - timing.enteredAt.getTime()) / 1000 : 0;
        if (secondsElapsed < 14.5) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(14.5 - secondsElapsed)} more seconds`
          };
        }

        if (!input.hasScrolledEnough && (!input.scrollPosition || !input.maxScrollPosition)) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: "Please scroll down to continue"
          };
        }

        await redirectSessionRepository.updateStep(sessionId, currentStep, {
          scrollPosition: input.scrollPosition || 100,
          maxScrollPosition: input.maxScrollPosition || 100,
          hasScrolledEnough: true
        });
        await redirectSessionRepository.markStepComplete(sessionId, 2);
        break;
      }

      case 3: {
        const stepTimings = (Array.isArray(session.stepTimings) ? session.stepTimings : []) as FunnelStepTiming[];
        const timing = stepTimings.find((step) => step.step === currentStep);
        const secondsElapsed = timing ? (now.getTime() - timing.enteredAt.getTime()) / 1000 : 0;
        if (secondsElapsed < 14.5) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(14.5 - secondsElapsed)} more seconds`
          };
        }

        if (!input.ctaClicked) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: "Click the call-to-action to continue"
          };
        }

        await redirectSessionRepository.updateStep(sessionId, currentStep, {
          ctaClicked: true
        });
        await redirectSessionRepository.markSponsorClicked(sessionId);
        await redirectSessionRepository.markStepComplete(sessionId, 3);
        break;
      }

      case 4: {
        // Prefer explicit entered-at timing for step 4, but fall back to
        // sponsor click time or session start to avoid transient races where
        // the timing record hasn't been written yet.
        const stepTimings = (Array.isArray(session.stepTimings) ? session.stepTimings : []) as FunnelStepTiming[];
        const timing = stepTimings.find((step) => step.step === currentStep);
        const enteredAt = timing?.enteredAt ?? session.step4CompleteAt ?? session.sponsorClickedAt ?? session.startedAt ?? session.createdAt;
        const secondsElapsed = enteredAt ? (now.getTime() - new Date(enteredAt).getTime()) / 1000 : 0;

        if (secondsElapsed < REQUIRED_WAIT) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(REQUIRED_WAIT - secondsElapsed)} more seconds`
          };
        }

        if (!session.sponsorClickedAt) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: "Sponsor verification is required before unlocking"
          };
        }

        await redirectSessionRepository.markStepComplete(sessionId, 4);
        break;
      }

      case 5:
        await redirectSessionRepository.markCompleted(sessionId);
        break;

      default:
        throw buildServiceError("Invalid step number", StatusCodes.BAD_REQUEST);
    }

    if (nextStep <= maxSteps) {
      await redirectSessionRepository.updateStep(sessionId, nextStep, {});
      await redirectSessionRepository.addStepTiming(sessionId, nextStep, {
        step: nextStep,
        enteredAt: new Date()
      });
    }

    return {
      isValid: true,
      nextStep: Math.min(nextStep, maxSteps)
    };
  }

  async getSessionStatus(
    sessionId: string
  ): Promise<{
    isComplete: boolean;
    isQualified: boolean;
    currentStep: number;
    sponsorClicked: boolean;
  }> {
    const session = await redirectSessionRepository.findById(sessionId);
    if (!session) {
      throw buildServiceError("Session not found", StatusCodes.NOT_FOUND);
    }

    return {
      isComplete: session.currentStep >= 5,
      isQualified: session.isQualified,
      currentStep: session.currentStep,
      sponsorClicked: Boolean(session.sponsorClickedAt)
    };
  }

  async getProgress(
    sessionId: string
  ): Promise<{
    currentStep: number;
    completedSteps: number[];
    progress: number;
    shortCode: string;
  }> {
    const session = await redirectSessionRepository.findById(sessionId);
    if (!session) {
      throw buildServiceError("Session not found", StatusCodes.NOT_FOUND);
    }

    return {
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      progress: (session.completedSteps.length / 5) * 100,
      shortCode: session.shortCode
    };
  }
}

export const funnelValidationService = new FunnelValidationService();
