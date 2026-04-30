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
    switch (currentStep) {
      case 1: // Blog/Article page
        // Step 1 just requires viewing the page, no special validation
        // Advance to step 2 (scroll unlock)
        break;

      case 2: // Scroll unlock
        if (!input.scrollPosition || !input.maxScrollPosition) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: "Scroll position not provided"
          };
        }

        // Require 80% scroll
        const scrollPercent = (input.scrollPosition / (input.maxScrollPosition || 1)) * 100;
        if (scrollPercent < 80) {
          return {
            isValid: false,
            nextStep: currentStep,
            message: `Need to scroll more (${Math.round(scrollPercent)}% / 80%)`
          };
        }

        await redirectSessionRepository.updateStep(sessionId, currentStep, {
          scrollPosition: input.scrollPosition,
          maxScrollPosition: input.maxScrollPosition,
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

      case 4: // Reward verification
        // Verification happens server-side, just confirm session
        break;

      case 5: // Final unlock
        // No additional validation needed for final step
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

    // Qualify the session when completing step 5
    if (currentStep === 5) {
      await redirectSessionRepository.markAsQualified(sessionId);
    }

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
