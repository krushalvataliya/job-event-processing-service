import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongo, closeMongo } from '../../src/db/client.js';
import { ensureIndexes } from '../../src/db/indexes.js';
import { EventsRepository } from '../../src/db/events-repository.js';
import { computeEventContentHash } from '../../src/domain/hashing.js';
import type { Db } from 'mongodb';

describe('Task 2.3: Events Repository (Insert-First & Claiming)', () => {
  let db: Db;
  let repo: EventsRepository;
  const testTenant = `test-evt-repo-${Date.now()}`;

  beforeAll(async () => {
    const conn = await connectMongo();
    db = conn.db;
    await ensureIndexes(db);
    repo = new EventsRepository(db);
  });

  afterAll(async () => {
    await db.collection('events').deleteMany({ tenantId: testTenant });
    await closeMongo();
  });

  it('inserts new event and returns status inserted', async () => {
    const payload = {
      title: 'Dev',
      company: 'Co',
      location: 'Surat',
      experienceMin: 1,
      experienceMax: 3,
      applyUrl: 'https://example.com',
      skills: ['ts'],
    };
    const hash = computeEventContentHash({
      externalJobId: 'job-1',
      version: 1,
      operation: 'upsert',
      payload,
    });

    const res = await repo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId: 'evt-1',
      externalJobId: 'job-1',
      version: 1,
      operation: 'upsert',
      payload,
      payloadHash: hash,
      rawPayload: payload,
    });

    expect(res.status).toBe('inserted');
    expect(res.event._id).toBeDefined();
    expect(res.event.status).toBe('pending');
  });

  it('handles exact duplicate replay and returns status duplicate_replay', async () => {
    const payload = {
      title: 'Dev',
      company: 'Co',
      location: 'Surat',
      experienceMin: 1,
      experienceMax: 3,
      applyUrl: 'https://example.com',
      skills: ['ts'],
    };
    const hash = computeEventContentHash({
      externalJobId: 'job-1',
      version: 1,
      operation: 'upsert',
      payload,
    });

    const res = await repo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId: 'evt-1',
      externalJobId: 'job-1',
      version: 1,
      operation: 'upsert',
      payload,
      payloadHash: hash,
      rawPayload: payload,
    });

    expect(res.status).toBe('duplicate_replay');
    expect(res.event.eventId).toBe('evt-1');
  });

  it('detects conflicting payload reuse and returns status conflict', async () => {
    const diffPayload = {
      title: 'Senior Dev', // modified title!
      company: 'Co',
      location: 'Surat',
      experienceMin: 1,
      experienceMax: 3,
      applyUrl: 'https://example.com',
      skills: ['ts'],
    };
    const diffHash = computeEventContentHash({
      externalJobId: 'job-1',
      version: 1,
      operation: 'upsert',
      payload: diffPayload,
    });

    const res = await repo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId: 'evt-1',
      externalJobId: 'job-1',
      version: 1,
      operation: 'upsert',
      payload: diffPayload,
      payloadHash: diffHash,
      rawPayload: diffPayload,
    });

    expect(res.status).toBe('conflict');
  });

  it('handles high concurrency insert races: exactly 1 inserted, others replay', async () => {
    const eventId = `concurrent-evt-${Date.now()}`;
    const payload = {
      title: 'Concurrency Engineer',
      company: 'HighLoad Inc',
      location: 'Remote',
      experienceMin: 2,
      experienceMax: 5,
      applyUrl: 'https://example.com',
      skills: ['distributed-systems'],
    };
    const hash = computeEventContentHash({
      externalJobId: 'job-c1',
      version: 1,
      operation: 'upsert',
      payload,
    });

    const promises = Array.from({ length: 10 }).map(() =>
      repo.insertEvent({
        tenantId: testTenant,
        sourceId: 'main',
        eventId,
        externalJobId: 'job-c1',
        version: 1,
        operation: 'upsert',
        payload,
        payloadHash: hash,
        rawPayload: payload,
      })
    );

    const results = await Promise.all(promises);
    const insertedCount = results.filter((r) => r.status === 'inserted').length;
    const replayCount = results.filter((r) => r.status === 'duplicate_replay').length;

    expect(insertedCount).toBe(1);
    expect(replayCount).toBe(9);
  });

  it('claims pending event and prevents double-claiming by competing workers', async () => {
    const eventId = `claim-evt-${Date.now()}`;
    const payload = { title: 'Test', company: 'Co', location: 'L', experienceMin: 0, experienceMax: 1, applyUrl: 'https://x.com', skills: ['a'] };
    await repo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId,
      externalJobId: 'job-claim',
      version: 1,
      operation: 'upsert',
      payload,
      payloadHash: 'hash-claim',
      rawPayload: payload,
    });

    const [workerA, workerB] = await Promise.all([
      repo.claimNextEvent('worker-1', 15000),
      repo.claimNextEvent('worker-2', 15000),
    ]);

    // At least one claims it, and they must NOT claim the exact same document
    const claimedEventIds = [workerA?.eventId, workerB?.eventId].filter(Boolean);
    const uniqueClaimed = new Set(claimedEventIds);
    expect(uniqueClaimed.size).toBe(claimedEventIds.length);
  });

  it('recovers abandoned work when leaseExpiresAt passes', async () => {
    const eventId = `recover-evt-${Date.now()}`;
    const payload = { title: 'Abandoned Job', company: 'Ghost Co', location: 'Void', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com', skills: ['ghost'] };
    const insertRes = await repo.insertEvent({
      tenantId: testTenant,
      sourceId: 'main',
      eventId,
      externalJobId: 'job-abandoned',
      version: 1,
      operation: 'upsert',
      payload,
      payloadHash: 'hash-ghost',
      rawPayload: payload,
    });

    // Simulate worker-dead holding lease that expired 5 seconds ago
    const pastDate = new Date(Date.now() - 5000);
    await db.collection('events').updateOne(
      { _id: insertRes.event._id },
      {
        $set: {
          status: 'claimed',
          claimedBy: 'worker-crashed',
          leaseExpiresAt: pastDate,
          nextAttemptAt: pastDate,
        },
      }
    );

    // Another worker should recover this expired claim
    const recovered = await repo.claimNextEvent('worker-rescuer', 15000);
    expect(recovered).toBeDefined();
    expect(recovered?.claimedBy).toBe('worker-rescuer');
    expect(recovered?.status).toBe('claimed');
  });
});
