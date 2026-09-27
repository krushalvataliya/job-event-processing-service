import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongo, closeMongo } from '../../src/db/client.js';
import { ensureIndexes } from '../../src/db/indexes.js';
import { buildApp } from '../../src/api/app.js';
import type { FastifyInstance } from 'fastify';
import type { Db } from 'mongodb';

describe('Task 4.6: API Contract, Status Codes, and Tenant Isolation', () => {
  let db: Db;
  let app: FastifyInstance;
  const tenantA = `tenant-api-a-${Date.now()}`;
  const tenantB = `tenant-api-b-${Date.now()}`;

  beforeAll(async () => {
    const conn = await connectMongo();
    db = conn.db;
    await ensureIndexes(db);
    app = buildApp({ db, logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await db.collection('events').deleteMany({ tenantId: { $in: [tenantA, tenantB] } });
    await db.collection('jobs').deleteMany({ tenantId: { $in: [tenantA, tenantB] } });
    await app.close();
    await closeMongo();
  });

  describe('POST /events', () => {
    const validEvent = {
      tenantId: tenantA,
      sourceId: 'main',
      eventId: 'evt-201',
      externalJobId: 'job-alpha',
      version: 1,
      operation: 'upsert',
      payload: {
        title: 'Full Stack Engineer',
        company: 'Artha Corp',
        location: 'Surat',
        experienceMin: 2,
        experienceMax: 4,
        applyUrl: 'https://example.com/apply',
        skills: ['TypeScript', 'MongoDB'],
      },
    };

    it('returns 202 Accepted on durable acceptance of new event', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload: validEvent,
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('accepted');
      expect(body.eventId).toBe('evt-201');
    });

    it('returns 200 OK on exact duplicate replay with identical JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload: validEvent,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('duplicate_replay');
      expect(body.eventId).toBe('evt-201');
    });

    it('returns 409 Conflict when reusing eventId with differing content', async () => {
      const conflictEvent = {
        ...validEvent,
        payload: {
          ...validEvent.payload,
          title: 'Different Title - Senior Dev', // Changed title!
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload: conflictEvent,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('EVENT_ID_CONFLICT');
    });

    it('returns 400 Bad Request on whitespace in identifier and DOES NOT reserve eventId', async () => {
      const badIdEvent = {
        ...validEvent,
        eventId: 'evt-whitespace-test',
        tenantId: ' tenant-with-leading-space', // Bad whitespace!
      };

      const response1 = await app.inject({
        method: 'POST',
        url: '/events',
        payload: badIdEvent,
      });

      expect(response1.statusCode).toBe(400);

      // Now send corrected request reusing the exact same eventId
      const correctedEvent = {
        ...badIdEvent,
        tenantId: tenantA, // Fixed whitespace
      };

      const response2 = await app.inject({
        method: 'POST',
        url: '/events',
        payload: correctedEvent,
      });

      // Must be accepted (202), proving eventId was not locked/reserved by the rejected request
      expect(response2.statusCode).toBe(202);
    });

    it('returns 400 Bad Request on invalid payload (non-https URL)', async () => {
      const invalidUrlEvent = {
        ...validEvent,
        eventId: 'evt-bad-url',
        payload: {
          ...validEvent.payload,
          applyUrl: 'http://insecure.example.com',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload: invalidUrlEvent,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /events/:eventId', () => {
    it('returns 200 with event processing status for existing event', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/evt-201?tenantId=${tenantA}&sourceId=main`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.eventId).toBe('evt-201');
      expect(body.tenantId).toBe(tenantA);
      expect(body.status).toBe('pending');
    });

    it('returns 404 Not Found for cross-tenant query (strict tenant isolation)', async () => {
      // Query evt-201 under Tenant B where it does not exist
      const response = await app.inject({
        method: 'GET',
        url: `/events/evt-201?tenantId=${tenantB}&sourceId=main`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 Bad Request when tenantId or sourceId is omitted', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events/evt-201',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /jobs', () => {
    beforeAll(async () => {
      // Insert mock job in Tenant A
      await db.collection('jobs').insertOne({
        tenantId: tenantA,
        sourceId: 'main',
        externalJobId: 'job-iso-a',
        currentVersion: 1,
        status: 'active',
        payload: { title: 'Job Tenant A', company: 'Co A', location: 'Surat', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com', skills: ['ts'] },
        archivedAtVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Insert mock job in Tenant B
      await db.collection('jobs').insertOne({
        tenantId: tenantB,
        sourceId: 'main',
        externalJobId: 'job-iso-b',
        currentVersion: 1,
        status: 'active',
        payload: { title: 'Job Tenant B', company: 'Co B', location: 'Surat', experienceMin: 1, experienceMax: 2, applyUrl: 'https://x.com', skills: ['ts'] },
        archivedAtVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('strictly isolates tenant reads: Tenant A cannot see Tenant B jobs', async () => {
      const resA = await app.inject({
        method: 'GET',
        url: `/jobs?tenantId=${tenantA}`,
      });

      expect(resA.statusCode).toBe(200);
      const bodyA = JSON.parse(resA.body);
      expect(bodyA.items.length).toBeGreaterThan(0);
      expect(bodyA.items.every((j: any) => j.tenantId === tenantA)).toBe(true);

      const resB = await app.inject({
        method: 'GET',
        url: `/jobs?tenantId=${tenantB}`,
      });

      expect(resB.statusCode).toBe(200);
      const bodyB = JSON.parse(resB.body);
      expect(bodyB.items.every((j: any) => j.tenantId === tenantB)).toBe(true);
    });

    it('returns 400 when tenantId query param is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/jobs',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /health', () => {
    it('returns 200 OK with mongodb readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.checks.mongodb.status).toBe('ok');
    });
  });
});
