import { describe, it, expect } from 'vitest';
import { validateEventInput } from '../../src/domain/validation.js';

describe('Task 1.1: Event Input Validation', () => {
  const validUpsert = {
    tenantId: 'tenant-a',
    sourceId: 'main',
    eventId: 'event-101',
    externalJobId: 'alpha',
    version: 1,
    operation: 'upsert' as const,
    payload: {
      title: 'Full Stack Developer',
      company: 'Example Labs',
      location: 'Surat',
      experienceMin: 1,
      experienceMax: 3,
      applyUrl: 'https://example.test/jobs/alpha',
      skills: [' TypeScript ', 'MongoDB', 'typescript'],
    },
  };

  const validArchive = {
    tenantId: 'tenant-a',
    sourceId: 'main',
    eventId: 'event-102',
    externalJobId: 'alpha',
    version: 2,
    operation: 'archive' as const,
  };

  it('accepts valid upsert event', () => {
    const res = validateEventInput(validUpsert);
    expect(res.success).toBe(true);
  });

  it('accepts valid archive event without payload', () => {
    const res = validateEventInput(validArchive);
    expect(res.success).toBe(true);
  });

  it('rejects identifier with leading whitespace', () => {
    const res = validateEventInput({ ...validUpsert, tenantId: ' tenant-a' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errors[0]).toContain('leading or trailing whitespace');
    }
  });

  it('rejects identifier with trailing whitespace', () => {
    const res = validateEventInput({ ...validUpsert, eventId: 'event-101 ' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errors[0]).toContain('leading or trailing whitespace');
    }
  });

  it('rejects zero or negative versions', () => {
    const resZero = validateEventInput({ ...validUpsert, version: 0 });
    expect(resZero.success).toBe(false);

    const resNeg = validateEventInput({ ...validUpsert, version: -1 });
    expect(resNeg.success).toBe(false);
  });

  it('rejects non-integer version', () => {
    const res = validateEventInput({ ...validUpsert, version: 1.5 });
    expect(res.success).toBe(false);
  });

  it('rejects non-https applyUrl', () => {
    const res = validateEventInput({
      ...validUpsert,
      payload: { ...validUpsert.payload, applyUrl: 'http://example.test/jobs/alpha' },
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errors.some((e) => e.includes('https://'))).toBe(true);
    }
  });

  it('rejects experienceMin greater than experienceMax', () => {
    const res = validateEventInput({
      ...validUpsert,
      payload: { ...validUpsert.payload, experienceMin: 5, experienceMax: 2 },
    });
    expect(res.success).toBe(false);
  });

  it('rejects experience out of bounds (> 50)', () => {
    const res = validateEventInput({
      ...validUpsert,
      payload: { ...validUpsert.payload, experienceMax: 55 },
    });
    expect(res.success).toBe(false);
  });

  it('rejects blank title after trimming', () => {
    const res = validateEventInput({
      ...validUpsert,
      payload: { ...validUpsert.payload, title: '    ' },
    });
    expect(res.success).toBe(false);
  });

  it('rejects archive event that includes an upsert payload', () => {
    const res = validateEventInput({
      ...validArchive,
      payload: validUpsert.payload,
    });
    expect(res.success).toBe(false);
  });
});
