import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongo, closeMongo } from '../../src/db/client.js';
import { ensureIndexes } from '../../src/db/indexes.js';
import { JobsRepository } from '../../src/db/jobs-repository.js';
import type { Db } from 'mongodb';

describe('Task 2.4: Jobs Repository (Conditional Projection & Tombstone)', () => {
  let db: Db;
  let repo: JobsRepository;
  const testTenant = `test-jobs-repo-${Date.now()}`;

  beforeAll(async () => {
    const conn = await connectMongo();
    db = conn.db;
    await ensureIndexes(db);
    repo = new JobsRepository(db);
  });

  afterAll(async () => {
    await db.collection('jobs').deleteMany({ tenantId: testTenant });
    await closeMongo();
  });

  it('applies initial upsert v1 correctly', async () => {
    const payload = {
      title: 'Engineer v1',
      company: 'Acme',
      location: 'Surat',
      experienceMin: 1,
      experienceMax: 2,
      applyUrl: 'https://example.com/1',
      skills: ['ts'],
    };

    const res = await repo.applyUpsert(testTenant, 'main', 'job-alpha', 1, payload);
    expect(res.applied).toBe(true);

    const job = await repo.getJob(testTenant, 'main', 'job-alpha');
    expect(job).toBeDefined();
    expect(job?.currentVersion).toBe(1);
    expect(job?.status).toBe('active');
    expect(job?.payload?.title).toBe('Engineer v1');
  });

  it('ignores delayed stale lower-version upsert v1 after v2', async () => {
    const payloadV2 = {
      title: 'Engineer v2',
      company: 'Acme',
      location: 'Surat',
      experienceMin: 1,
      experienceMax: 3,
      applyUrl: 'https://example.com/2',
      skills: ['ts', 'node'],
    };

    // Apply v2
    const resV2 = await repo.applyUpsert(testTenant, 'main', 'job-alpha', 2, payloadV2);
    expect(resV2.applied).toBe(true);

    // Now try to apply older v1
    const payloadV1 = { ...payloadV2, title: 'Old Engineer v1' };
    const resOld = await repo.applyUpsert(testTenant, 'main', 'job-alpha', 1, payloadV1);
    expect(resOld.applied).toBe(false);

    // Job must still reflect v2
    const job = await repo.getJob(testTenant, 'main', 'job-alpha');
    expect(job?.currentVersion).toBe(2);
    expect(job?.payload?.title).toBe('Engineer v2');
  });

  it('supports archive-before-upsert and blocks lower version upserts', async () => {
    // Archive arrives at version 3 for brand new job
    const archiveRes = await repo.applyArchive(testTenant, 'main', 'job-tombstone', 3);
    expect(archiveRes.applied).toBe(true);

    const jobArchived = await repo.getJob(testTenant, 'main', 'job-tombstone');
    expect(jobArchived?.status).toBe('archived');
    expect(jobArchived?.archivedAtVersion).toBe(3);
    expect(jobArchived?.payload).toBeNull();

    // Stale upsert v2 arriving after archive v3 must be ignored
    const stalePayload = {
      title: 'Stale Dev',
      company: 'Acme',
      location: 'Surat',
      experienceMin: 0,
      experienceMax: 1,
      applyUrl: 'https://example.com',
      skills: ['go'],
    };
    const staleRes = await repo.applyUpsert(testTenant, 'main', 'job-tombstone', 2, stalePayload);
    expect(staleRes.applied).toBe(false);

    // Status remains archived
    const checkStale = await repo.getJob(testTenant, 'main', 'job-tombstone');
    expect(checkStale?.status).toBe('archived');

    // Higher upsert v4 reactivates the job
    const higherPayload = { ...stalePayload, title: 'Reactivated Dev' };
    const higherRes = await repo.applyUpsert(testTenant, 'main', 'job-tombstone', 4, higherPayload);
    expect(higherRes.applied).toBe(true);

    const checkReactivated = await repo.getJob(testTenant, 'main', 'job-tombstone');
    expect(checkReactivated?.status).toBe('active');
    expect(checkReactivated?.currentVersion).toBe(4);
    expect(checkReactivated?.payload?.title).toBe('Reactivated Dev');
  });

  it('guarantees highest version wins under concurrent out-of-order writes', async () => {
    const jobId = `concurrent-job-${Date.now()}`;
    const versions = [1, 5, 2, 4, 3];

    await Promise.all(
      versions.map((ver) =>
        repo.applyUpsert(testTenant, 'main', jobId, ver, {
          title: `Dev v${ver}`,
          company: 'Acme',
          location: 'Surat',
          experienceMin: ver,
          experienceMax: ver + 1,
          applyUrl: `https://example.com/${ver}`,
          skills: [`skill-${ver}`],
        })
      )
    );

    const finalJob = await repo.getJob(testTenant, 'main', jobId);
    expect(finalJob?.currentVersion).toBe(5);
    expect(finalJob?.payload?.title).toBe('Dev v5');
  });

  it('supports deterministic cursor-based pagination', async () => {
    const pTenant = `page-tenant-${Date.now()}`;
    // Insert 15 active jobs
    for (let i = 1; i <= 15; i++) {
      await repo.applyUpsert(pTenant, 'main', `job-${i.toString().padStart(2, '0')}`, 1, {
        title: `Engineer ${i}`,
        company: 'Co',
        location: 'Surat',
        experienceMin: 1,
        experienceMax: 2,
        applyUrl: 'https://example.com',
        skills: ['ts'],
      });
    }

    // Page 1: limit 5
    const page1 = await repo.listJobs({ tenantId: pTenant, limit: 5 });
    expect(page1.items.length).toBe(5);
    expect(page1.nextCursor).toBeDefined();

    // Page 2: limit 5
    const page2 = await repo.listJobs({ tenantId: pTenant, limit: 5, cursor: page1.nextCursor! });
    expect(page2.items.length).toBe(5);
    expect(page2.nextCursor).toBeDefined();

    // Page 3: limit 5
    const page3 = await repo.listJobs({ tenantId: pTenant, limit: 5, cursor: page2.nextCursor! });
    expect(page3.items.length).toBe(5);
    expect(page3.nextCursor).toBeNull(); // No more pages

    // Cleanup
    await db.collection('jobs').deleteMany({ tenantId: pTenant });
  });
});
