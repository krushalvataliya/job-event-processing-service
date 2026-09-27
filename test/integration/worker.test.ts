import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongo, closeMongo } from '../../src/db/client.js';
import { ensureIndexes } from '../../src/db/indexes.js';
import { EventsRepository } from '../../src/db/events-repository.js';
import { JobsRepository } from '../../src/db/jobs-repository.js';
import { VerificationClient } from '../../src/provider/verification-client.js';
import { WorkerEngine } from '../../src/worker/worker-engine.js';
import { computeEventContentHash } from '../../src/domain/hashing.js';
import type { Db } from 'mongodb';

describe('Task 3.4 & 3.5: Worker Concurrency, Retries, and Crash Recovery', () => {
  let db: Db;
  let eventsRepo: EventsRepository;
  let jobsRepo: JobsRepository;
  let provider: VerificationClient;
  const testTenant = `test-worker-${Date.now()}`;

  beforeAll(async () => {
    const conn = await connectMongo();
    db = conn.db;
    await ensureIndexes(db);
    eventsRepo = new EventsRepository(db);
    jobsRepo = new JobsRepository(db);
    provider = new VerificationClient();
  });

  afterAll(async () => {
    await db.collection('events').deleteMany({ tenantId: testTenant });
    await db.collection('jobs').deleteMany({ tenantId: testTenant });
    await closeMongo();
  });

  it('runs multiple competing workers concurrently with zero double-processing', async () => {
    const worker1 = new WorkerEngine('comp-worker-1', eventsRepo, jobsRepo, provider, {
      pollIntervalMs: 50,
      leaseMs: 5000,
      baseDelayMs: 100,
      maxAttempts: 3,
      tenantId: testTenant,
    });
    const worker2 = new WorkerEngine('comp-worker-2', eventsRepo, jobsRepo, provider, {
      pollIntervalMs: 50,
      leaseMs: 5000,
      baseDelayMs: 100,
      maxAttempts: 3,
      tenantId: testTenant,
    });

    // Ingest 6 events
    for (let i = 1; i <= 6; i++) {
      const payload = { title: `Job ${i}`, company: 'C', location: 'L', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com', skills: ['ts'] };
      await eventsRepo.insertEvent({
        tenantId: testTenant,
        sourceId: 'main',
        eventId: `comp-evt-${i}`,
        externalJobId: `comp-job-${i}`,
        version: 1,
        operation: 'upsert',
        payload,
        payloadHash: computeEventContentHash({ externalJobId: `comp-job-${i}`, version: 1, operation: 'upsert', payload }),
        rawPayload: payload,
      });
    }

    // Start workers
    worker1.start();
    worker2.start();

    // Poll until queue is drained
    let pending = await eventsRepo.countPendingOrClaimed(testTenant);
    let attempts = 0;
    while (pending > 0 && attempts < 150) {
      await new Promise((r) => setTimeout(r, 100));
      pending = await eventsRepo.countPendingOrClaimed(testTenant);
      attempts++;
    }

    await worker1.stop();
    await worker2.stop();

    expect(pending).toBe(0);

    // Verify all 6 events are completed
    const events = await db.collection('events').find({ tenantId: testTenant, eventId: /^comp-evt-/ }).toArray();
    expect(events.length).toBe(6);
    for (const evt of events) {
      expect(evt.status).toBe('completed');
      expect(evt.attempts).toBe(1);
    }
  });

  it('handles transient failure retry progression (503 -> 503 -> success)', async () => {
    const eventId = `retry-transient-${Date.now()}`;
    provider.setPlan({
      [eventId]: ['503', '503', 'success'],
    });

    const payload = { title: 'Retry Job', company: 'C', location: 'L', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com', skills: ['ts'] };
    const insertRes = await eventsRepo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId,
      externalJobId: 'job-transient',
      version: 1,
      operation: 'upsert',
      payload,
      payloadHash: 'hash-retry',
      rawPayload: payload,
    });

    const worker = new WorkerEngine('worker-retry', eventsRepo, jobsRepo, provider, {
      pollIntervalMs: 50,
      leaseMs: 5000,
      baseDelayMs: 50, // fast backoff for test
      maxAttempts: 3,
    });

    // Attempt 1: 503
    await worker.runOnce();
    const eventAfter1 = await eventsRepo.getEvent(testTenant, 'main', eventId);
    expect(eventAfter1?.status).toBe('pending');
    expect(eventAfter1?.attempts).toBe(1);

    // Fast-forward nextAttemptAt so worker can immediately pick up attempt 2
    await db.collection('events').updateOne({ _id: insertRes.event._id }, { $set: { nextAttemptAt: new Date() } });

    // Attempt 2: 503
    await worker.runOnce();
    const eventAfter2 = await eventsRepo.getEvent(testTenant, 'main', eventId);
    expect(eventAfter2?.status).toBe('pending');
    expect(eventAfter2?.attempts).toBe(2);

    // Fast-forward nextAttemptAt
    await db.collection('events').updateOne({ _id: insertRes.event._id }, { $set: { nextAttemptAt: new Date() } });

    // Attempt 3: success
    await worker.runOnce();
    const eventAfter3 = await eventsRepo.getEvent(testTenant, 'main', eventId);
    expect(eventAfter3?.status).toBe('completed');
    expect(eventAfter3?.attempts).toBe(3);
    expect(eventAfter3?.attemptHistory.length).toBe(3);

    // Job projection exists
    const job = await jobsRepo.getJob(testTenant, 'main', 'job-transient');
    expect(job?.currentVersion).toBe(1);
    expect(job?.status).toBe('active');
  });

  it('fails immediately on permanent error 422 without mutating projection', async () => {
    const eventId = `perm-fail-${Date.now()}`;
    provider.setPlan({
      [eventId]: ['422'],
    });

    const payload = { title: 'Bad Job', company: 'C', location: 'L', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com', skills: ['ts'] };
    await eventsRepo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId,
      externalJobId: 'job-perm-fail',
      version: 1,
      operation: 'upsert',
      payload,
      payloadHash: 'hash-perm',
      rawPayload: payload,
    });

    const worker = new WorkerEngine('worker-perm', eventsRepo, jobsRepo, provider, {
      pollIntervalMs: 50,
      leaseMs: 5000,
      baseDelayMs: 50,
      maxAttempts: 3,
    });

    await worker.runOnce();

    const event = await eventsRepo.getEvent(testTenant, 'main', eventId);
    expect(event?.status).toBe('failed');
    expect(event?.attempts).toBe(1);
    expect(event?.lastError).toContain('422');

    // Job projection must NOT be created
    const job = await jobsRepo.getJob(testTenant, 'main', 'job-perm-fail');
    expect(job).toBeNull();
  });

  it('recovers cleanly from deliberate crash-before-ack without duplicate jobs', async () => {
    const eventId = `crash-test-${Date.now()}`;
    provider.setPlan({ [eventId]: ['success'] });

    const payload = { title: 'Crash Resilient Dev', company: 'Robust Corp', location: 'Surat', experienceMin: 2, experienceMax: 4, applyUrl: 'https://x.com', skills: ['ts'] };
    const insertRes = await eventsRepo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId,
      externalJobId: 'job-crash-recovery',
      version: 1,
      operation: 'upsert',
      payload,
      payloadHash: 'hash-crash',
      rawPayload: payload,
    });

    const worker1 = new WorkerEngine('worker-crasher', eventsRepo, jobsRepo, provider, {
      pollIntervalMs: 50,
      leaseMs: 5000,
      baseDelayMs: 50,
      maxAttempts: 3,
    });

    // Inject crash right after projection write, before acknowledgment write
    worker1.setCrashHook(async (_stage, _evt) => {
      throw new Error('SIMULATED_PROCESS_CRASH_POST_PROJECTION');
    });

    // Worker 1 runs and crashes
    await expect(worker1.runOnce()).rejects.toThrow('SIMULATED_PROCESS_CRASH_POST_PROJECTION');

    // State at this point:
    // - Projection is written:
    const jobMid = await jobsRepo.getJob(testTenant, 'main', 'job-crash-recovery');
    expect(jobMid?.currentVersion).toBe(1);

    // - Event is STILL claimed by worker-crasher:
    const eventMid = await eventsRepo.getEvent(testTenant, 'main', eventId);
    expect(eventMid?.status).toBe('claimed');
    expect(eventMid?.claimedBy).toBe('worker-crasher');

    // Fast forward lease expiration
    const past = new Date(Date.now() - 10000);
    await db.collection('events').updateOne({ _id: insertRes.event._id }, { $set: { leaseExpiresAt: past, nextAttemptAt: past } });

    // Worker 2 recovers the abandoned work
    const worker2 = new WorkerEngine('worker-rescuer', eventsRepo, jobsRepo, provider, {
      pollIntervalMs: 50,
      leaseMs: 5000,
      baseDelayMs: 50,
      maxAttempts: 3,
    });

    const recovered = await worker2.runOnce();
    expect(recovered).toBe(true);

    // Event is now completed
    const eventFinal = await eventsRepo.getEvent(testTenant, 'main', eventId);
    expect(eventFinal?.status).toBe('completed');

    // Projection is intact, exactly one job document exists
    const jobFinal = await jobsRepo.getJob(testTenant, 'main', 'job-crash-recovery');
    expect(jobFinal?.currentVersion).toBe(1);
    expect(jobFinal?.payload?.title).toBe('Crash Resilient Dev');
  });

  it('guarantees that higher version verification failure preserves active lower version', async () => {
    // 1. Lower version v1 succeeds
    const evt1 = `pres-v1-${Date.now()}`;
    const payloadV1 = { title: 'Stable v1', company: 'Co', location: 'L', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com/1', skills: ['ts'] };
    await eventsRepo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId: evt1,
      externalJobId: 'job-preservation',
      version: 1,
      operation: 'upsert',
      payload: payloadV1,
      payloadHash: 'hash-v1',
      rawPayload: payloadV1,
    });

    const worker = new WorkerEngine('worker-pres', eventsRepo, jobsRepo, provider, {
      pollIntervalMs: 50,
      leaseMs: 5000,
      baseDelayMs: 50,
      maxAttempts: 3,
    });

    await worker.runOnce();
    const jobV1 = await jobsRepo.getJob(testTenant, 'main', 'job-preservation');
    expect(jobV1?.currentVersion).toBe(1);
    expect(jobV1?.payload?.title).toBe('Stable v1');

    // 2. Higher version v2 fails verification (422)
    const evt2 = `pres-v2-${Date.now()}`;
    provider.setPlan({ [evt2]: ['422'] });
    const payloadV2 = { title: 'Broken v2', company: 'Co', location: 'L', experienceMin: 1, experienceMax: 3, applyUrl: 'https://x.com/2', skills: ['ts'] };
    await eventsRepo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId: evt2,
      externalJobId: 'job-preservation',
      version: 2,
      operation: 'upsert',
      payload: payloadV2,
      payloadHash: 'hash-v2',
      rawPayload: payloadV2,
    });

    await worker.runOnce();

    // Event 2 is failed
    const event2 = await eventsRepo.getEvent(testTenant, 'main', evt2);
    expect(event2?.status).toBe('failed');

    // Crucial PRD guarantee: Job projection MUST still reflect v1!
    const jobAfterV2Fail = await jobsRepo.getJob(testTenant, 'main', 'job-preservation');
    expect(jobAfterV2Fail?.currentVersion).toBe(1);
    expect(jobAfterV2Fail?.payload?.title).toBe('Stable v1');
  });
});
