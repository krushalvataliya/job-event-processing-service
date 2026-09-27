import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongo, closeMongo } from '../../src/db/client.js';
import { checkMongoHealth } from '../../src/db/health.js';

describe('Task 2.1: MongoDB Connection and Health Probe', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await closeMongo();
  });

  it('connects to MongoDB and reports healthy status with latency', async () => {
    const health = await checkMongoHealth();
    expect(health.status).toBe('ok');
    expect(typeof health.latencyMs).toBe('number');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
