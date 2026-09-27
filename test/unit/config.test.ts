import { describe, it, expect } from 'vitest';
import { config } from '../../src/config/index.js';

describe('Config Loader', () => {
  it('loads valid configuration with expected defaults', () => {
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.HOST).toBeDefined();
    expect(config.MONGO_URI).toBeDefined();
    expect(config.WORKER_COUNT).toBeGreaterThanOrEqual(1);
    expect(config.WORKER_POLL_INTERVAL_MS).toBeGreaterThan(0);
    expect(config.WORKER_LEASE_MS).toBeGreaterThan(0);
    expect(config.RETRY_BASE_DELAY_MS).toBeGreaterThan(0);
    expect(config.RETRY_MAX_ATTEMPTS).toBe(3);
    expect(['debug', 'info', 'warn', 'error']).toContain(config.LOG_LEVEL);
  });

  it('provides frozen immutable config', () => {
    expect(Object.isFrozen(config)).toBe(true);
  });
});
