# Task 3.4: Lease Expiry Recovery and Crash Injection
Status: DONE

## Objective
Implement durable recovery for crashed or stalled workers based strictly on database lease expiration (`leaseExpiresAt`), and introduce test hooks to simulate deterministic crash-before-ack scenarios.

## Background & Requirements
Per PRD §6.2, §8 & IMPLEMENTATION_GUIDE.md §3:
1. **Durable Recovery Principles**:
   - In-process memory alone is **not** durable recovery.
   - If a worker crashes or hangs indefinitely while holding a claimed event, another worker must pick it up once `leaseExpiresAt < now`.
   - Recovery must not produce duplicate logical jobs or corrupt the projection.
2. **Crash-Before-Ack Scenario**:
   - Worker claims event $\rightarrow$ successfully updates `jobs` projection $\rightarrow$ CRASHES before updating `events` status to `completed`.
   - The document remains with `status: 'claimed'` and an active lease.
   - When the lease expires, Worker 2 claims it.
   - What happens next?
     - Worker 2 runs:
       1. Checks staleness against `jobs`: The projection already has `currentVersion >= event.version` (from the previous crashed attempt)!
       2. Worker 2 detects this is already applied or stale $\rightarrow$ completes the event as a safe no-op.
       3. OR: Re-applying the conditional update is completely idempotent because of `currentVersion: { $lt: version }`.
   - This guarantees that even without multi-document distributed transactions, the system converges to the exact correct state with zero data corruption.
3. **Deterministic Crash Injection Hook**:
   - Provide a hook in `WorkerEngine`:
     ```ts
     export type WorkerCrashHook = (stage: 'post_projection_pre_ack', event: JobEventDoc) => Promise<void> | void;
     ```
   - In tests, setting this hook to throw an unhandled error or terminate worker loop allows asserting recovery behavior deterministically.

## Detailed Steps

1. **Add Crash Hooks to WorkerEngine**:
   - Support `setCrashHook(hook: WorkerCrashHook)` in worker engine for testing purposes.
   - Invoke hook immediately after `jobsRepository.applyUpsert(...)` and prior to `eventsRepository.recordSuccess(...)`.

2. **Document Crash Semantics in Code and DESIGN.md**:
   - Document whether a crash consumes a retry attempt:
     - If the crash happens before provider verification, it does not consume a retry attempt; it is a worker failure.
     - If it happens after projection write, on recovery it completes safely because projection update is idempotent.

## Verification Criteria
- [ ] Injecting a crash after projection update leaves event in `claimed` state with `leaseExpiresAt`.
- [ ] Fast-forwarding or waiting for lease expiration allows a second worker to claim and complete the event without duplicate work or errors.
- [ ] Final job state reflects expected version and payload with zero corruption.
