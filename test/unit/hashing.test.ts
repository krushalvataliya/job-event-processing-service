import { describe, it, expect } from 'vitest';
import {
  canonicalStringify,
  computePayloadHash,
  computeEventContentHash,
} from '../../src/domain/hashing.js';

describe('Task 1.3: Canonical Payload Hashing', () => {
  it('produces identical string and hash regardless of object key order', () => {
    const objA = { a: 1, b: 2, c: { x: 'hello', y: 'world' } };
    const objB = { b: 2, c: { y: 'world', x: 'hello' }, a: 1 };

    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
    expect(computePayloadHash(objA)).toBe(computePayloadHash(objB));
  });

  it('preserves array order and differentiates reordered arrays', () => {
    const objA = { skills: ['mongodb', 'typescript'] };
    const objB = { skills: ['typescript', 'mongodb'] };

    expect(canonicalStringify(objA)).not.toBe(canonicalStringify(objB));
    expect(computePayloadHash(objA)).not.toBe(computePayloadHash(objB));
  });

  it('differentiates different values', () => {
    const objA = { title: 'Full Stack Dev', version: 1 };
    const objB = { title: 'Backend Dev', version: 1 };

    expect(computePayloadHash(objA)).not.toBe(computePayloadHash(objB));
  });

  it('handles null, booleans, and numbers deterministically', () => {
    const valA = { flag: true, count: 42, empty: null };
    const valB = { count: 42, empty: null, flag: true };

    expect(canonicalStringify(valA)).toBe(canonicalStringify(valB));
    expect(computePayloadHash(valA)).toBe(computePayloadHash(valB));
  });

  it('computes identical event content hash for semantically equivalent events', () => {
    const eventA = {
      externalJobId: 'job-101',
      version: 1,
      operation: 'upsert',
      payload: { title: 'Engineer', location: 'Surat' },
    };
    const eventB = {
      version: 1,
      externalJobId: 'job-101',
      payload: { location: 'Surat', title: 'Engineer' },
      operation: 'upsert',
    };

    expect(computeEventContentHash(eventA)).toBe(computeEventContentHash(eventB));
  });

  it('computes different hash if version or operation changes', () => {
    const eventA = {
      externalJobId: 'job-101',
      version: 1,
      operation: 'upsert',
      payload: { title: 'Engineer' },
    };
    const eventB = {
      externalJobId: 'job-101',
      version: 2,
      operation: 'upsert',
      payload: { title: 'Engineer' },
    };

    expect(computeEventContentHash(eventA)).not.toBe(computeEventContentHash(eventB));
  });
});
