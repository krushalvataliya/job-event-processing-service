# Task 1.1: Domain Models and Zod Schemas
Status: DONE

## Objective
Define the TypeScript types, interfaces, and strict Zod validation schemas for job change events, payloads, and projection entities.

## Background & Requirements
Per PRD §5 & §6.1:
- **Identifiers**: `tenantId`, `sourceId`, `eventId`, `externalJobId` must be non-empty strings.
- **Strict Whitespace Rule**: Reject if any identifier contains leading or trailing whitespace (e.g. `" tenant-a"` or `"event-101 "`). DO NOT silently trim identifiers! This is an immediate `400 Bad Request`.
- **Version**: Positive safe integer (`Number.isSafeInteger(v) && v > 0`).
- **Operation**: Either `"upsert"` or `"archive"`.
- **Payload Requirements**:
  - `upsert`: requires `payload` object.
  - `archive`: must omit `payload` (or `payload` is null/undefined).
- **Payload Field Specifications (before normalization)**:
  - `title`: string (must be non-blank after trimming).
  - `company`: string (must be non-blank after trimming).
  - `location`: string (must be non-blank after trimming).
  - `experienceMin`: integer between 0 and 50.
  - `experienceMax`: integer between 0 and 50, with `experienceMin <= experienceMax`.
  - `applyUrl`: string, must start with `https://` and be a valid URL.
  - `skills`: array of non-blank strings.

## Detailed Steps

1. **Create `src/domain/types.ts`**:
   - Define TypeScript types:
     ```ts
     export type EventOperation = 'upsert' | 'archive';
     export type EventStatus = 'pending' | 'claimed' | 'completed' | 'failed';
     export type JobStatus = 'active' | 'archived';
     export type AttemptOutcome = 'success' | 'retryable_error' | 'permanent_error';

     export interface RawJobPayload {
       title: string;
       company: string;
       location: string;
       experienceMin: number;
       experienceMax: number;
       applyUrl: string;
       skills: string[];
     }

     export interface NormalizedJobPayload {
       title: string;
       company: string;
       location: string;
       experienceMin: number;
       experienceMax: number;
       applyUrl: string;
       skills: string[];
     }

     export interface AttemptRecord {
       attemptNumber: number;
       startedAt: Date;
       outcome: AttemptOutcome;
       httpStatus?: number;
       error?: string;
       nextRetryAt?: Date;
     }

     export interface JobEventDoc {
       _id?: any;
       tenantId: string;
       sourceId: string;
       eventId: string;
       externalJobId: string;
       version: number;
       operation: EventOperation;
       payload: NormalizedJobPayload | null;
       payloadHash: string;
       rawPayload: unknown;
       status: EventStatus;
       attempts: number;
       attemptHistory: AttemptRecord[];
       lastError: string | null;
       claimedBy: string | null;
       claimedAt: Date | null;
       leaseExpiresAt: Date | null;
       nextAttemptAt: Date | null;
       createdAt: Date;
       completedAt: Date | null;
     }

     export interface JobProjectionDoc {
       _id?: any;
       tenantId: string;
       sourceId: string;
       externalJobId: string;
       currentVersion: number;
       status: JobStatus;
       payload: NormalizedJobPayload | null;
       archivedAtVersion: number | null;
       updatedAt: Date;
       createdAt: Date;
     }
     ```

2. **Create `src/domain/validation.ts`**:
   - Implement custom Zod validator for non-whitespace-padded string:
     ```ts
     export const strictIdentifier = z.string()
       .min(1, 'Identifier cannot be empty')
       .refine(val => val === val.trim(), {
         message: 'Identifier must not contain leading or trailing whitespace'
       });
     ```
   - Implement payload schema with `.refine()` checking `experienceMin <= experienceMax` and `applyUrl` starting with `https://`.
   - Discriminated union or conditional schema validating `upsert` vs `archive`.
   - Export `validateEventInput(input: unknown)` returning typed parsed data or formatted validation error messages.

## Verification Criteria
- [ ] Identifying strings with leading/trailing whitespace (e.g. `" test"`, `"test "`) trigger validation errors.
- [ ] Non-integer or negative or zero versions fail validation.
- [ ] `experienceMin > experienceMax` fails validation.
- [ ] `http://` URLs fail validation (`https://` required).
- [ ] `archive` operation with a payload is rejected or payload is stripped according to spec.
