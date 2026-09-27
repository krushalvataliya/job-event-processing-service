# System Architecture & Design Specification (DESIGN.md)

## 1. Domain Invariants & Guarantees

1. **At-Least-Once Processing, Exactly-Once State Effect**:
   - In distributed systems, exactly-once network transmission is physically impossible across failure domains. We guarantee **at-least-once processing with strictly idempotent state effects**.
   - Multiple attempts or duplicate deliveries converge to the exact same projected state without duplication or side-effect leakage.
2. **Monotonic Version Resolution**:
   - The job projection strictly reflects the highest successfully verified version:
     $$\text{currentVersion}_{\text{new}} = \max(\text{currentVersion}_{\text{old}}, \text{incomingVersion})$$
   - Out-of-order delivery cannot overwrite newer state with older data.
3. **Archive Tombstone Durability**:
   - An archive event sets `status: 'archived'` and permanently registers `archivedAtVersion = \max(archivedAtVersion, version)`.
   - Delayed upserts with `version <= archivedAtVersion` are unconditionally rejected by the conditional query and treated as no-ops.
4. **Tenant Isolation**:
   - Data partitioning is logically enforced on every query boundary using `tenantId`.

---

## 2. Work Lifecycle & State Machine

```
      [ POST /events ]
             │
             ▼
        [ pending ] ◄────────────────┐ (Retry with backoff)
             │                       │
             ▼ (Worker Claim)        │
        [ claimed ] ─────────────────┤
        (lease: 15s)                 │
             │                       │
     ┌───────┴────────┐              │
     │  Verification  │              │
     └───────┬────────┘              │
             ├──► 429 / 503 (attempts < 3)
             │
             ├──► 422 OR (attempts == 3) ──► [ failed ] (Terminal)
             │
             └──► 200 Success
                     │
                     ▼
             [ Apply Projection ]
                     │
                     ▼
              [ completed ] (Terminal)
```

---

## 3. Atomicity Boundaries & Data Model

### Single Source of Truth
We utilize MongoDB as both the durable ingestion queue and the projection store:
- Avoids the dual-write problem inherent in coordinating Redis/Kafka with a persistent database.
- Provides immediate read-after-write consistency for event audit status.

### The Single Conditional Write Boundary
Instead of multi-document distributed transactions or distributed locking, version monotonicity is enforced with a single atomic conditional write:
```ts
db.jobs.updateOne(
  {
    tenantId, sourceId, externalJobId,
    currentVersion: { $lt: incomingVersion },
    $or: [
      { status: { $ne: "archived" } },
      { archivedAtVersion: { $lt: incomingVersion } }
    ]
  },
  {
    $set: {
      currentVersion: incomingVersion,
      status: "active",
      payload,
      updatedAt: now
    },
    $setOnInsert: { createdAt: now }
  },
  { upsert: true }
);
```

---

## 4. Failure Mode Analysis & Independent Failure Scenarios

| Failure Point | Impact | Recovery Path |
|---|---|---|
| **Acceptance Write Fails** | Ingestion call throws error to client. | Caller receives 500/timeout; client retries safely. No corrupted state in DB. |
| **Worker Crashes In-Flight** | Document remains `status: 'claimed'`. | After `leaseExpiresAt` passes, another worker automatically reclaims the document. |
| **Worker Crashes Post-Projection, Pre-Ack** | Projection updated, but event not marked `completed`. | Recovering worker re-runs; projection write is idempotent no-op (`currentVersion < incomingVersion` fails); event is safely marked `completed`. |
| **Provider Rate-Limit (429/503)** | Transient upstream failure. | Event rescheduled to `pending` with `nextAttemptAt = now + backoff`. Unclaimed. |

---

## 5. Crash Attempt Consumption Rationale

**Policy Decision**:
- Unhandled worker process crashes or lease expirations **do NOT consume an upstream provider retry attempt**.
- **Rationale**: An attempt count measures upstream provider exhaustion (e.g. rate limits or server instability). Burning an attempt count due to a local worker crash would prematurely fail a valid job posting. Worker lease recovery is handled independently by the lease expiry mechanism.

---

## 6. Alternatives Considered & Rejected

1. **Dedicated Broker (Redis / Kafka / RabbitMQ)**:
   - *Rejected*: Introducing an external broker introduces the classic two-phase commit / dual-write problem: if Mongo write fails after broker ack (or vice versa), state diverges. MongoDB handles both durable queuing and indexing with transactional consistency.
2. **Check-Then-Insert Idempotency**:
   - *Rejected*: Prone to Time-of-Check to Time-of-Use (TOCTOU) race conditions under high concurrent submissions. An insert-first unique index pattern is the only 100% race-safe approach.
3. **Optimistic Locking via In-Memory Version Checks**:
   - *Rejected*: Requires distributed lock managers across workers. Atomic conditional database updates eliminate distributed coordination overhead entirely.

---

## 7. Bottlenecks & Strategic Tradeoffs

- **First Bottleneck**: MongoDB polling query contention on `{ status: 1, nextAttemptAt: 1 }` under high worker counts. Mitigated by tuned poll intervals and indexed sort.
- **Accepted Tradeoff**: Polling-based worker loops vs change streams. Polling was chosen for maximum determinism and simplicity across standalone Mongo instances.
