# Task 1.3: Canonical Payload Hashing

## Objective
Implement deterministic canonical JSON hashing for events to distinguish exact replay requests (`200 OK`) from conflicting reuse of identical event IDs with modified content (`409 Conflict`).

## Background & Requirements
Per PRD §6.1 & IMPLEMENTATION_GUIDE.md §1 & §2:
- Idempotency identity is `(tenantId, sourceId, eventId)`.
- When an identical identity is submitted again:
  - If the content is **byte-equivalent** (ignoring object key order, but **preserving array order**), the system must return `200 OK` without creating duplicate work.
  - If the content differs in any semantic way, the system must return `409 Conflict`.
- Hashing must:
  - Recursively sort all object keys lexicographically.
  - Preserve array element order verbatim (`[1, 2] !== [2, 1]`).
  - Compute SHA-256 hex digest of the canonical stringified representation.
  - Include relevant event fields in the hash: `externalJobId`, `version`, `operation`, and `payload` (or full normalized event request).

## Detailed Steps

1. **Create `src/domain/hashing.ts`**:
   - Implement `canonicalizeJson(value: unknown): string`:
     ```ts
     import crypto from 'node:crypto';

     export function canonicalStringify(value: unknown): string {
       if (value === null || typeof value !== 'object') {
         return JSON.stringify(value);
       }

       if (Array.isArray(value)) {
         return '[' + value.map(canonicalStringify).join(',') + ']';
       }

       const obj = value as Record<string, unknown>;
       const sortedKeys = Object.keys(obj).sort();
       const entries = sortedKeys.map(
         (k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`
       );
       return '{' + entries.join(',') + '}';
     }

     export function computePayloadHash(content: unknown): string {
       const canonicalString = canonicalStringify(content);
       return crypto.createHash('sha256').update(canonicalString).digest('hex');
     }
     ```

2. **Define Hashed Target Representation**:
   - Clearly define what gets hashed:
     - The semantic event payload containing:
       - `externalJobId`
       - `version`
       - `operation`
       - `payload` (the normalized payload if upsert, or `null` if archive).
   - Alternatively hash the normalized incoming body `(externalJobId, version, operation, payload)` to ensure any modification in version or operation triggers `409 Conflict`.

## Verification Criteria
- [ ] Objects with identical keys in different orders produce identical hashes:
  - `{"a": 1, "b": 2}` and `{"b": 2, "a": 1}` $\rightarrow$ identical hash.
- [ ] Arrays with different ordering produce different hashes:
  - `{"skills": ["a", "b"]}` and `{"skills": ["b", "a"]}` $\rightarrow$ distinct hashes.
- [ ] Different field values produce distinct hashes.
- [ ] Nested objects with reordered keys hash identically.
