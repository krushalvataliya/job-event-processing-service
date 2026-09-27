import { describe, it, expect } from 'vitest';
import { VerificationClient } from '../../src/provider/verification-client.js';

describe('Task 3.1: Fake Verification Provider Client', () => {
  it('returns default success for unlisted events', async () => {
    const client = new VerificationClient();
    client.setPlan({});

    const res = await client.verifyEvent('unknown-event', 1);
    expect(res.outcome).toBe('success');
    expect(res.httpStatus).toBe(200);
  });

  it('follows planned sequence for transient failure and recovery', async () => {
    const client = new VerificationClient();
    client.setPlan({
      'test-event': ['503', '429', 'success'],
    });

    const res1 = await client.verifyEvent('test-event', 1);
    expect(res1.outcome).toBe('retryable_error');
    expect(res1.httpStatus).toBe(503);

    const res2 = await client.verifyEvent('test-event', 2);
    expect(res2.outcome).toBe('retryable_error');
    expect(res2.httpStatus).toBe(429);

    const res3 = await client.verifyEvent('test-event', 3);
    expect(res3.outcome).toBe('success');
    expect(res3.httpStatus).toBe(200);
  });

  it('returns permanent error for 422 planned outcome', async () => {
    const client = new VerificationClient();
    client.setPlan({
      'bad-event': ['422'],
    });

    const res = await client.verifyEvent('bad-event', 1);
    expect(res.outcome).toBe('permanent_error');
    expect(res.httpStatus).toBe(422);
  });
});
