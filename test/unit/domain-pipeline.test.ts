import { describe, it, expect } from 'vitest';
import { validateEventInput } from '../../src/domain/validation.js';
import { normalizePayload } from '../../src/domain/normalization.js';
import { computeEventContentHash } from '../../src/domain/hashing.js';

describe('Task 1.4: Domain Pipeline Hermetic Test Suite', () => {
  it('processes valid upsert end-to-end through validation, normalization, and hashing', () => {
    const rawInput = {
      tenantId: 'tenant-a',
      sourceId: 'main',
      eventId: 'event-101',
      externalJobId: 'alpha',
      version: 1,
      operation: 'upsert',
      payload: {
        title: ' Full Stack Developer ',
        company: ' Example Labs ',
        location: ' Surat ',
        experienceMin: 1,
        experienceMax: 3,
        applyUrl: 'https://example.test/jobs/alpha',
        skills: [' TypeScript ', 'MongoDB', 'typescript', 'NODE.JS'],
      },
    };

    // 1. Validation
    const validationRes = validateEventInput(rawInput);
    expect(validationRes.success).toBe(true);
    if (!validationRes.success) return;

    // 2. Normalization
    expect(validationRes.data.operation).toBe('upsert');
    if (validationRes.data.operation !== 'upsert') return;
    const normalizedPayload = normalizePayload(validationRes.data.payload);
    expect(normalizedPayload.title).toBe('Full Stack Developer');
    expect(normalizedPayload.company).toBe('Example Labs');
    expect(normalizedPayload.location).toBe('Surat');
    expect(normalizedPayload.skills).toEqual(['typescript', 'mongodb', 'node.js']);

    // 3. Hashing
    const hash = computeEventContentHash({
      externalJobId: validationRes.data.externalJobId,
      version: validationRes.data.version,
      operation: validationRes.data.operation,
      payload: normalizedPayload,
    });

    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // SHA-256 hex string length
  });

  it('handles archive event end-to-end with null payload hash', () => {
    const rawArchive = {
      tenantId: 'tenant-a',
      sourceId: 'main',
      eventId: 'event-102',
      externalJobId: 'alpha',
      version: 2,
      operation: 'archive',
    };

    const validationRes = validateEventInput(rawArchive);
    expect(validationRes.success).toBe(true);
    if (!validationRes.success) return;

    const hash = computeEventContentHash({
      externalJobId: validationRes.data.externalJobId,
      version: validationRes.data.version,
      operation: validationRes.data.operation,
      payload: null,
    });

    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
  });

  it('confirms that two identical requests with different key ordering produce identical hashes', () => {
    const input1 = {
      externalJobId: 'job-1',
      version: 1,
      operation: 'upsert',
      payload: {
        title: 'Dev',
        company: 'Corp',
        location: 'Remote',
        experienceMin: 0,
        experienceMax: 2,
        applyUrl: 'https://example.com',
        skills: ['react', 'node'],
      },
    };

    const input2 = {
      payload: {
        skills: ['react', 'node'],
        experienceMax: 2,
        experienceMin: 0,
        applyUrl: 'https://example.com',
        location: 'Remote',
        company: 'Corp',
        title: 'Dev',
      },
      operation: 'upsert',
      version: 1,
      externalJobId: 'job-1',
    };

    const hash1 = computeEventContentHash(input1);
    const hash2 = computeEventContentHash(input2);

    expect(hash1).toBe(hash2);
  });
});
