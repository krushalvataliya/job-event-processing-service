import { describe, it, expect } from 'vitest';
import { SERVICE_NAME } from '../../src/index.js';

describe('Scaffold Smoke Test', () => {
  it('loads project service name', () => {
    expect(SERVICE_NAME).toBe('job-event-processing-service');
  });
});
