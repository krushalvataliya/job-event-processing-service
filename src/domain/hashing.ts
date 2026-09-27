import crypto from 'node:crypto';

/**
 * Recursively canonicalizes an arbitrary JavaScript value into a stable JSON string:
 * - Object keys are sorted lexicographically at every level.
 * - Array element ordering is strictly preserved.
 * - Primitives (string, number, boolean, null) stringify deterministically.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalStringify(item)).join(',') + ']';
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`
  );

  return '{' + entries.join(',') + '}';
}

/**
 * Computes a SHA-256 hex digest of the canonical JSON string.
 */
export function computePayloadHash(content: unknown): string {
  const canonical = canonicalStringify(content);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Computes canonical hash for an incoming job event based on its semantic content:
 * externalJobId, version, operation, and payload.
 */
export function computeEventContentHash(event: {
  externalJobId: string;
  version: number;
  operation: string;
  payload: unknown;
}): string {
  return computePayloadHash({
    externalJobId: event.externalJobId,
    version: event.version,
    operation: event.operation,
    payload: event.payload ?? null,
  });
}
