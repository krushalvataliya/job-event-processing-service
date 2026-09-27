# Task 1.4: Domain Unit Tests

## Objective
Author comprehensive, hermetic unit tests in `test/unit/` covering event validation, normalization, and canonical hashing without requiring any database or external dependencies.

## Background & Requirements
Per PRD §8 & IMPLEMENTATION_GUIDE.md §8:
- Unit test suite must run fast and validate all validation rules and edge cases.
- Must test:
  1. Identifiers rejection on leading/trailing whitespace.
  2. Safe positive integer version enforcement.
  3. Experience range constraints (`0 <= min <= max <= 50`).
  4. URL protocol enforcement (`https://` required).
  5. Skills deduplication and order preservation.
  6. Empty or blank field rejection after trimming (`title`, `company`, `location`).
  7. Canonical JSON stringification key-order independence and array-order sensitivity.
  8. Hash comparison for exact matching vs conflicting payloads.

## Detailed Steps

1. **Create `test/unit/validation.test.ts`**:
   - Test cases:
     - Valid upsert event payload passes.
     - Valid archive event (with no payload) passes.
     - Rejects whitespace in `tenantId` (`" tenant-a"`, `"tenant-a "`, `"tenant\ta"`).
     - Rejects whitespace in `sourceId`, `eventId`, `externalJobId`.
     - Rejects version <= 0, float versions, NaN, strings.
     - Rejects `experienceMin < 0` or `experienceMax > 50`.
     - Rejects `experienceMin > experienceMax`.
     - Rejects non-https URL (e.g. `http://example.com`, `ftp://example.com`).
     - Rejects archive event if it includes an unexpected payload structure.

2. **Create `test/unit/normalization.test.ts`**:
   - Test cases:
     - Trimming of `title`, `company`, `location`.
     - Error if `title` is `"   "` (spaces only).
     - Skills normalization: lowercase conversion, trimming, removing duplicates, keeping first occurrence.
     - Example: `[" TypeScript ", "MongoDB", "typescript"]` $\rightarrow$ `["typescript", "mongodb"]`.

3. **Create `test/unit/hashing.test.ts`**:
   - Test cases:
     - Key order permutations produce byte-for-byte identical output.
     - Nested object key permutations produce identical hashes.
     - Array element reordering produces different hashes.
     - Primitive data types (numbers, booleans, null) stringify deterministically.

## Verification Criteria
- [ ] Running `npm run test:unit` executes all tests in under 2 seconds.
- [ ] 100% pass rate on edge cases and failure modes.
- [ ] No database connection is attempted in unit tests.
