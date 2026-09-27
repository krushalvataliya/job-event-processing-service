import type { EventsRepository } from '../db/events-repository.js';
import type { JobsRepository } from '../db/jobs-repository.js';
import type { VerificationClient } from '../provider/verification-client.js';
import type { JobEventDoc, AttemptRecord } from '../domain/types.js';
import { computeNextAttemptDate } from './backoff.js';

export type WorkerCrashHook = (
  stage: 'post_projection_pre_ack',
  event: JobEventDoc
) => Promise<void> | void;

export interface WorkerEngineOptions {
  pollIntervalMs: number;
  leaseMs: number;
  baseDelayMs: number;
  maxAttempts: number;
}

export class WorkerEngine {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private crashHook: WorkerCrashHook | null = null;

  constructor(
    public readonly workerId: string,
    private eventsRepo: EventsRepository,
    private jobsRepo: JobsRepository,
    private provider: VerificationClient,
    private options: WorkerEngineOptions
  ) {}

  setCrashHook(hook: WorkerCrashHook | null): void {
    this.crashHook = hook;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNextTick(0);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Wait until currently in-flight event finishes
    while (this.isProcessing) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private scheduleNextTick(delayMs: number): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      try {
        await this.runOnce();
      } catch (err) {
        console.error(`[Worker ${this.workerId}] Unhandled loop error:`, err);
      } finally {
        if (this.running) {
          this.scheduleNextTick(this.options.pollIntervalMs);
        }
      }
    }, delayMs);
  }

  /**
   * Executes a single claim-and-process iteration.
   * Returns true if an event was claimed and processed, false if backlog was empty.
   */
  async runOnce(): Promise<boolean> {
    if (this.isProcessing) return false;
    this.isProcessing = true;

    try {
      const event = await this.eventsRepo.claimNextEvent(
        this.workerId,
        this.options.leaseMs
      );

      if (!event) {
        return false;
      }

      await this.processEvent(event);
      return true;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Complete lifecycle processing for a claimed event.
   */
  async processEvent(event: JobEventDoc): Promise<void> {
    const now = new Date();
    const currentAttempt = event.attempts + 1;

    // 1. Staleness Pre-Check against Current Projection
    const existingJob = await this.jobsRepo.getJob(
      event.tenantId,
      event.sourceId,
      event.externalJobId
    );

    if (existingJob) {
      const isStaleVersion = event.version <= existingJob.currentVersion;
      const isBlockedByArchive =
        existingJob.status === 'archived' &&
        existingJob.archivedAtVersion !== null &&
        event.version <= existingJob.archivedAtVersion;

      if (isStaleVersion || isBlockedByArchive) {
        // Safe no-op completion: bypass external verification
        const staleAttempt: AttemptRecord = {
          attemptNumber: currentAttempt,
          startedAt: now,
          outcome: 'success',
          error: 'stale_version_skipped',
        };

        await this.eventsRepo.recordSuccess(event._id!, staleAttempt, now);
        return;
      }
    }

    // 2. Simulated Upstream Verification
    const startedAt = new Date();
    const result = await this.provider.verifyEvent(event.eventId, currentAttempt);

    if (result.outcome === 'success') {
      // Apply projection update atomically
      if (event.operation === 'upsert' && event.payload) {
        await this.jobsRepo.applyUpsert(
          event.tenantId,
          event.sourceId,
          event.externalJobId,
          event.version,
          event.payload,
          now
        );
      } else if (event.operation === 'archive') {
        await this.jobsRepo.applyArchive(
          event.tenantId,
          event.sourceId,
          event.externalJobId,
          event.version,
          now
        );
      }

      // Test hook for crash-before-ack simulation
      if (this.crashHook) {
        await this.crashHook('post_projection_pre_ack', event);
      }

      // Record successful event completion
      const successAttempt: AttemptRecord = {
        attemptNumber: currentAttempt,
        startedAt,
        outcome: 'success',
        httpStatus: result.httpStatus,
      };

      await this.eventsRepo.recordSuccess(event._id!, successAttempt, now);
    } else if (result.outcome === 'retryable_error') {
      // 429 or 503
      if (currentAttempt < this.options.maxAttempts) {
        // Schedule next backoff retry
        const nextAttemptAt = computeNextAttemptDate(
          currentAttempt,
          this.options.baseDelayMs
        );
        const retryAttempt: AttemptRecord = {
          attemptNumber: currentAttempt,
          startedAt,
          outcome: 'retryable_error',
          httpStatus: result.httpStatus,
          error: result.errorMessage,
          nextRetryAt: nextAttemptAt,
        };

        await this.eventsRepo.recordRetry(event._id!, retryAttempt, nextAttemptAt);
      } else {
        // Retries exhausted -> Terminal failure
        const exhaustedAttempt: AttemptRecord = {
          attemptNumber: currentAttempt,
          startedAt,
          outcome: 'retryable_error',
          httpStatus: result.httpStatus,
          error: `Retries exhausted after ${currentAttempt} attempts: ${result.errorMessage}`,
        };

        await this.eventsRepo.recordFailure(
          event._id!,
          exhaustedAttempt,
          exhaustedAttempt.error!
        );
      }
    } else {
      // Permanent failure (422) -> Terminal failure immediately
      const permAttempt: AttemptRecord = {
        attemptNumber: currentAttempt,
        startedAt,
        outcome: 'permanent_error',
        httpStatus: result.httpStatus,
        error: result.errorMessage || 'Permanent verification failure',
      };

      await this.eventsRepo.recordFailure(
        event._id!,
        permAttempt,
        permAttempt.error!
      );
    }
  }
}
