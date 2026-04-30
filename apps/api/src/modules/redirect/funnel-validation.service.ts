import { StatusCodes } from "http-status-codes";
import { redirectSessionRepository } from "../../repositories/redirect-session.repository";
import { redirectService } from "./redirect.service";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class FunnelValidationService {
  /**
   * Validate funnel step and advance if valid
   */
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
    if (!session || session.currentStep !== currentStep) {
      throw buildServiceError("Invalid session or step mismatch", StatusCodes.BAD_REQUEST);
    }

    const nextStep = currentStep + 1;
    const maxSteps = 5;

    // Validate step-specific requirements
    const timing = session.stepTimings.find(t => t.step === currentStep);
    const now = new Date();
    const secondsElapsed = timing ? (now.getTime() - timing.enteredAt.getTime()) / 1000 : 0;
    const REQUIRED_WAIT = 9.5; // Allow slight buffer for network/latency

    switch (currentStep) {
      case 1: // Blog/Article page - 10s timer
        if (secondsElapsed < REQUIRED_WAIT) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(REQUIRED_WAIT - secondsElapsed)} more seconds`
          };
        }
        break;

      case 2: // Scroll unlock + 10s timer
        if (secondsElapsed < REQUIRED_WAIT) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(REQUIRED_WAIT - secondsElapsed)} more seconds`
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
        break;

      case 3: // Sponsored ad/CTA
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
        break;

      case 4: // Reward verification + final 10s timer
        if (secondsElapsed < REQUIRED_WAIT) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Please wait ${Math.ceil(REQUIRED_WAIT - secondsElapsed)} more seconds`
          };
        }
        break;

      case 5: // Final unlock
        // Qualify the session when completing step 5
        await redirectSessionRepository.markAsQualified(sessionId);
        break;

      default:
        throw buildServiceError("Invalid step number", StatusCodes.BAD_REQUEST);
    }

    // Add timing for this step
    if (nextStep <= maxSteps) {
      await redirectSessionRepository.addStepTiming(sessionId, nextStep, {
        step: nextStep,
        enteredAt: new Date()
      });
    }

    // Qualification is handled in step 5 switch above

    return {
      isValid: true,
      nextStep: Math.min(nextStep, maxSteps)
    };
  }

  /**
   * Check if session is complete and qualified
   */
  async getSessionStatus(
    sessionId: string
  ): Promise<{
    isComplete: boolean;
    isQualified: boolean;
    currentStep: number;
    targetUrl?: string;
  }> {
    const session = await redirectSessionRepository.findById(sessionId);
    if (!session) {
      throw buildServiceError("Session not found", StatusCodes.NOT_FOUND);
    }

    const isComplete = session.currentStep === 5;
    const isQualified = session.isQualified;

    let targetUrl: string | undefined;
    if (isComplete) {
      // Lookup the actual URL from redirect service
      const resolved = await redirectService.inspectShortCode(session.shortCode);
      if (resolved.outcome === "ACTIVE") {
        targetUrl = resolved.targetUrl;
      }
    }

    return {
      isComplete,
      isQualified,
      currentStep: session.currentStep,
      targetUrl
    };
  }

  /**
   * Get funnel progress for a session
   */
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
