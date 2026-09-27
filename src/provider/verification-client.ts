import fs from 'node:fs';
import path from 'node:path';
import type { AttemptOutcome } from '../domain/types.js';

export interface ProviderResult {
  outcome: AttemptOutcome;
  httpStatus: number;
  errorMessage?: string;
}

export type ProviderPlanMap = Record<string, string[]>;

export class VerificationClient {
  private plan: ProviderPlanMap = {};

  constructor(private planFilePath?: string) {
    this.reloadPlan();
  }

  /**
   * Reloads plan from disk if file path exists.
   */
  reloadPlan(): void {
    const defaultPath = path.resolve(process.cwd(), 'fixtures', 'provider-plan.json');
    const targetPath = this.planFilePath || defaultPath;

    if (fs.existsSync(targetPath)) {
      try {
        const raw = fs.readFileSync(targetPath, 'utf8');
        this.plan = JSON.parse(raw);
      } catch (err) {
        console.warn(`Failed to parse provider-plan.json at ${targetPath}:`, err);
        this.plan = {};
      }
    } else {
      this.plan = {};
    }
  }

  /**
   * Directly sets plan in memory (useful for tests).
   */
  setPlan(plan: ProviderPlanMap): void {
    this.plan = plan;
  }

  /**
   * Verifies an event given its eventId and current attempt number (1-indexed).
   */
  async verifyEvent(eventId: string, attemptNumber: number): Promise<ProviderResult> {
    const plannedOutcomes = this.plan[eventId];
    const planned = plannedOutcomes?.[attemptNumber - 1];

    if (!planned || planned === 'success' || planned === '200') {
      return {
        outcome: 'success',
        httpStatus: 200,
      };
    }

    if (planned === '503') {
      return {
        outcome: 'retryable_error',
        httpStatus: 503,
        errorMessage: 'Simulated 503 Service Unavailable',
      };
    }

    if (planned === '429') {
      return {
        outcome: 'retryable_error',
        httpStatus: 429,
        errorMessage: 'Simulated 429 Too Many Requests',
      };
    }

    if (planned === '422') {
      return {
        outcome: 'permanent_error',
        httpStatus: 422,
        errorMessage: 'Simulated 422 Unprocessable Entity - External Verification Failed',
      };
    }

    // Default fallback
    return {
      outcome: 'success',
      httpStatus: 200,
    };
  }
}
