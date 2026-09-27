import { describe, it, expect, vi } from 'vitest';
import { WorkerEngine } from '../../src/worker/worker-engine.js';
import type { JobEventDoc } from '../../src/domain/types.js';

describe('Task 3.3: Worker Engine Logic', () => {
  it('identifies and skips stale events as no-op completions without calling provider', async () => {
    const mockEventsRepo = {
      claimNextEvent: vi.fn(),
      recordSuccess: vi.fn(),
      recordRetry: vi.fn(),
      recordFailure: vi.fn(),
    } as any;

    const mockJobsRepo = {
      getJob: vi.fn().mockResolvedValue({
        currentVersion: 3,
        status: 'active',
        archivedAtVersion: null,
      }),
      applyUpsert: vi.fn(),
      applyArchive: vi.fn(),
    } as any;

    const mockProvider = {
      verifyEvent: vi.fn(),
    } as any;

    const engine = new WorkerEngine('worker-test', mockEventsRepo, mockJobsRepo, mockProvider, {
      pollIntervalMs: 100,
      leaseMs: 5000,
      baseDelayMs: 500,
      maxAttempts: 3,
    });

    const staleEvent: JobEventDoc = {
      tenantId: 'tenant-1',
      sourceId: 'src-1',
      eventId: 'evt-stale',
      externalJobId: 'job-1',
      version: 2, // version 2 is stale since projection has version 3
      operation: 'upsert',
      payload: { title: 'Old', company: 'Co', location: 'L', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com', skills: ['ts'] },
      payloadHash: 'hash-1',
      rawPayload: null,
      status: 'claimed',
      attempts: 0,
      attemptHistory: [],
      lastError: null,
      claimedBy: 'worker-test',
      claimedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 5000),
      nextAttemptAt: null,
      createdAt: new Date(),
      completedAt: null,
    };

    await engine.processEvent(staleEvent);

    // Provider must NOT be called for stale event
    expect(mockProvider.verifyEvent).not.toHaveBeenCalled();

    // Event must be marked completed as no-op
    expect(mockEventsRepo.recordSuccess).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ error: 'stale_version_skipped' }),
      expect.any(Date)
    );
  });
});
