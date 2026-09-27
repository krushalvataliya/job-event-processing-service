import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongo, closeMongo } from '../../src/db/client.js';
import { ensureIndexes } from '../../src/db/indexes.js';
import type { Db } from 'mongodb';

describe('Task 2.2: MongoDB Indexes and Schema Management', () => {
  let db: Db;
  const testTenant = `test-idx-${Date.now()}`;

  beforeAll(async () => {
    const conn = await connectMongo();
    db = conn.db;
    await ensureIndexes(db);
  });

  afterAll(async () => {
    // Cleanup test data
    await db.collection('events').deleteMany({ tenantId: testTenant });
    await db.collection('jobs').deleteMany({ tenantId: testTenant });
    await closeMongo();
  });

  it('is idempotent and can be run multiple times safely', async () => {
    await expect(ensureIndexes(db)).resolves.not.toThrow();
  });

  it('enforces unique index on events: (tenantId, sourceId, eventId)', async () => {
    const events = db.collection('events');
    const doc1 = {
      tenantId: testTenant,
      sourceId: 'src-1',
      eventId: 'evt-100',
      externalJobId: 'job-1',
      version: 1,
      createdAt: new Date(),
    };

    await events.insertOne(doc1);

    // Attempting to insert another document with same tenantId, sourceId, eventId must fail with 11000
    const doc2 = {
      tenantId: testTenant,
      sourceId: 'src-1',
      eventId: 'evt-100',
      externalJobId: 'job-999',
      version: 2,
      createdAt: new Date(),
    };

    await expect(events.insertOne(doc2)).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('enforces unique index on jobs: (tenantId, sourceId, externalJobId)', async () => {
    const jobs = db.collection('jobs');
    const job1 = {
      tenantId: testTenant,
      sourceId: 'src-1',
      externalJobId: 'job-alpha',
      currentVersion: 1,
      createdAt: new Date(),
    };

    await jobs.insertOne(job1);

    // Attempting to insert duplicate job identity must fail with 11000
    const job2 = {
      tenantId: testTenant,
      sourceId: 'src-1',
      externalJobId: 'job-alpha',
      currentVersion: 2,
      createdAt: new Date(),
    };

    await expect(jobs.insertOne(job2)).rejects.toThrow(/E11000 duplicate key error/);
  });
});
