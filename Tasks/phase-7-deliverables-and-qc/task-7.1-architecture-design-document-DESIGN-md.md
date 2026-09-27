# Task 7.1: Architecture Design Document (DESIGN.md)
Status: TODO

## Objective
Author the comprehensive `DESIGN.md` architectural document detailing invariants, work lifecycle, atomicity boundaries, failure mode recovery, crash consumption semantics, rejected alternatives, and operational tradeoffs.

## Background & Requirements
Per PRD §9 & §10:
`DESIGN.md` must address:
1. **Core Invariants**:
   - Monotonic version progression.
   - At-least-once processing with exactly-once state effect.
   - Durable acceptance boundary.
2. **Work Lifecycle & State Machine**:
   - Event states: `pending` $\rightarrow$ `claimed` $\rightarrow$ `completed` | `failed`.
   - Transitions, lease duration, exponential backoff, and retry limits.
3. **Atomicity Boundaries & Data Model**:
   - Why MongoDB was chosen as the combined queue + audit store.
   - The single atomic conditional write pattern:
     ```ts
     { currentVersion: { $lt: incomingVersion } }
     ```
   - Why multi-document transactions were avoided in favor of idempotent conditional writes.
4. **Independent Failure Analysis**:
   - What happens if acceptance write fails? (Client receives 500, can safely retry; no half-created state).
   - What happens if projection update fails? (Event lease expires, another worker recovers).
   - What happens if completion acknowledgment write fails? (Recovered worker safely re-applies idempotent projection write and marks complete).
5. **Crash Attempt Consumption Semantics**:
   - Answer the required design question: Does a crashed worker consume an attempt?
   - Rationale: Explain why unhandled worker crashes / timeout expirations should NOT immediately burn an external provider attempt count, or why they are tracked separately from provider 429/503 errors.
6. **Alternatives Rejected**:
   - *Alternative 1: Redis / BullMQ / Kafka as queue broker*. (Rejected to keep runnable core self-contained with a single source of truth in MongoDB; avoid two-phase distributed consistency dilemmas).
   - *Alternative 2: Check-then-insert idempotency*. (Rejected due to TOCTOU race conditions under high concurrency; insert-first unique index is the only race-safe approach).
   - *Alternative 3: Optimistic Locking with Version Number in Memory*. (Rejected because workers are stateless and distributed across processes).
7. **First Bottleneck & Accepted Tradeoffs**:
   - Document the first likely bottleneck (e.g. MongoDB polling query contention on `idx_status_nextAttemptAt` under massive worker count).
   - Document tradeoffs accepted within the time budget.

## Detailed Steps

1. **Draft and Polish `DESIGN.md`**:
   - Ensure clear technical prose, mermaid diagrams for lifecycle and architecture, and concrete code references.
   - Address every question highlighted in the PRD and system specifications.

## Verification Criteria
- [ ] Addresses all 7 core topics specified above.
- [ ] Contains no unsubstantiated claims or buzzwords.
- [ ] Explicitly clarifies that the guarantee is idempotent effect, not exactly-once execution.
