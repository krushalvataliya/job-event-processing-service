# Implementation Guide (for AI coding agents)

This doc is the single source of truth for building the system. Follow it literally. Where you must deviate, note the deviation in `DESIGN.md`, not here.

Read `PRD.md` first for *why*. This doc is *how*.

---

## 0. Stack & repo layout

- Node.js ≥22, TypeScript strict mode.
- MongoDB (single node is fine; use a replica set only if you implement multi-doc transactions).
- Test runner: your choice (vitest/jest), but MongoDB-backed integration tests are mandatory for concurrency-sensitive paths — do not mock the DB for those.
- No Redis/Kafka/queue broker in the runnable core.

```
/src
  /api          # HTTP layer (routes, request validation, controllers)
  /domain       # pure domain logic: event validation/normalization, version rules
  /worker       # claim loop, verification call, retry/backoff, completion
  /db           # Mongo connection, collections, indexes, repositories
  /provider     # fake external verification client (reads fixtures/provider-plan.json)
  /config       # env/config loading
/fixtures
  provider-plan.json
  demo-scenario.json   # the 20-request fixture, phase 1 + phase 2
/scripts
  setup.ts / setup.sh
  demo.ts
  load-test.ts
/test
  /unit
  /integration       # real Mongo required
docker-compose.yml
.env.example
README.md / DESIGN.md / SCALE.md / AI_USAGE.md / QC_REPORT.md
```

---

## 1. Data model

### Collection: `events`

One document per accepted event identity. This is the durable work queue AND the audit/status record — do not create a separate "queue" collection; that's a second source of truth you'd need to keep in sync.

```ts
{
  _id: ObjectId,
  tenantId: string,
  sourceId: string,
  eventId: string,
  externalJobId: string,
  version: number,
  operation: "upsert" | "archive",
  payload: NormalizedPayload | null,   // null for archive
  payloadHash: string,                 // canonical hash of parsed JSON (key-order independent), for 200-vs-409 replay comparison
  rawPayload: unknown,                 // store parsed original for exact-content comparison if hashing alone is insufficient

  status: "pending" | "claimed" | "completed" | "failed",
  attempts: number,
  attemptHistory: Array<{
    attemptNumber: number,
    startedAt: Date,
    outcome: "success" | "retryable_error" | "permanent_error",
    httpStatus?: number,       // simulated provider status, if applicable
    error?: string,
    nextRetryAt?: Date
  }>,
  lastError: string | null,

  claimedBy: string | null,     // worker instance id
  claimedAt: Date | null,
  leaseExpiresAt: Date | null,  // visibility timeout for recovery
  nextAttemptAt: Date | null,   // backoff scheduling; workers query on this

  createdAt: Date,
  completedAt: Date | null
}
```

**Unique index:** `{ tenantId: 1, sourceId: 1, eventId: 1 }` — this is what makes duplicate submission race-safe: let Mongo reject the second insert, don't pre-check-then-insert.

**Worker claim query index:** `{ status: 1, nextAttemptAt: 1 }` (or a compound including `tenantId` if you want per-tenant fairness later — call this out in `SCALE.md`, not required now).

### Collection: `jobs` (current projection)

```ts
{
  _id: ObjectId,
  tenantId: string,
  sourceId: string,
  externalJobId: string,

  currentVersion: number,        // highest version with status "applied" or "archived"
  status: "active" | "archived",
  payload: NormalizedPayload | null,  // null if archived
  archivedAtVersion: number | null,   // tombstone marker; present even if no upsert ever succeeded

  updatedAt: Date,
  createdAt: Date
}
```

**Unique index:** `{ tenantId: 1, sourceId: 1, externalJobId: 1 }`.
**List index:** `{ tenantId: 1, sourceId: 1, status: 1, _id: 1 }` (or `currentVersion`) — pick a field with total order for cursor pagination and document the choice.

### Why one `jobs` doc per job, updated via conditional write

Use an atomic conditional update to enforce version monotonicity without a distributed lock:

```ts
db.jobs.updateOne(
  {
    tenantId, sourceId, externalJobId,
    currentVersion: { $lt: incomingVersion }   // only apply if strictly newer
  },
  {
    $set: { currentVersion: incomingVersion, payload, status, updatedAt: now },
    $setOnInsert: { createdAt: now }
  },
  { upsert: true }
)
```

- If `matchedCount === 0` and it wasn't an insert (job exists with `currentVersion >= incomingVersion`) → this event is stale for the projection; mark it completed as a no-op, do **not** treat as an error.
- Archive uses the same conditional pattern but sets `status: "archived"`, `payload: null`, and **always** updates `archivedAtVersion` to `max(archivedAtVersion ?? -1, incomingVersion)` even if it arrives before any upsert (upsert the doc with `status: archived` directly).
- An upsert event must additionally check: if `status === "archived"` and `incomingVersion <= archivedAtVersion`, skip (tombstone holds). If `incomingVersion > archivedAtVersion`, apply — a later upsert *can* reactivate only when its version exceeds the archive version (confirm this interpretation in `DESIGN.md`; the contract says archive prevents delayed *old* upserts from reactivating, implying a strictly newer upsert after an archive is legitimate new data).

This single atomic `findOneAndUpdate`-style conditional write is your **atomicity boundary** for version safety — no multi-document transaction needed for the common case.

---

## 2. Request flow — `POST /events`

```
1. Parse + Zod/JSON-schema validate body.
   -> invalid: return 400. Do NOT touch the events collection.
2. Normalize payload (trim title/company/location, validate experience range,
   validate https URL, normalize+dedupe skills) if operation === upsert.
3. Reject if tenantId/sourceId/eventId/externalJobId have leading/trailing whitespace
   (this is a 400, not a silent trim).
4. Compute canonical hash of the parsed request body relevant fields
   (stable-stringify with sorted keys; keep array order as-is).
5. Attempt insert into `events` with status: "pending", nextAttemptAt: now, attempts: 0.
   -> On unique index violation (duplicate eventId identity):
        fetch existing doc by (tenantId, sourceId, eventId)
        if existing.payloadHash === newHash -> return 200 with existing event summary
        else -> return 409
   -> On success: return 202 with event id/status location.
```

Do this insert-first, catch-duplicate-key approach rather than find-then-insert — it's the only race-safe way to implement idempotency under concurrent identical submissions (this is one of the required concurrent-duplicate-request tests).

---

## 3. Worker loop

Run the same worker function in ≥2 processes/loops (e.g., two `setInterval`-driven loops in the demo, or two child processes — either satisfies "at least two competing").

### Claim (atomic, race-safe)

```ts
const now = new Date();
const lease = new Date(now.getTime() + LEASE_MS);
const claimed = await db.events.findOneAndUpdate(
  {
    status: { $in: ["pending", "claimed"] },
    nextAttemptAt: { $lte: now },
    $or: [
      { status: "pending" },
      { leaseExpiresAt: { $lt: now } }   // recover abandoned claims
    ]
  },
  { $set: { status: "claimed", claimedBy: workerId, claimedAt: now, leaseExpiresAt: lease } },
  { sort: { nextAttemptAt: 1 }, returnDocument: "after" }
);
if (!claimed) { sleep(pollIntervalMs); continue; }
```

This single `findOneAndUpdate` is the concurrency-safety boundary: Mongo guarantees only one caller gets the matched document per call.

### Process claimed event

1. Look up current `jobs` projection for `(tenantId, sourceId, externalJobId)`.
2. **Staleness check**: if a projection exists and `event.version <= projection.currentVersion` (or `<= archivedAtVersion` when archived), this event is stale.
   - Skip verification. Mark `status: "completed"` as a no-op. Do not touch the projection. Done.
3. Otherwise call the fake provider (`/src/provider`) with the event, driven by `fixtures/provider-plan.json` (keyed by `eventId` or similar — define the fixture schema explicitly in code comments).
4. Interpret outcome:
   - **success** → apply the conditional projection update from §1. Mark event `status: "completed"`, `completedAt: now`. Append attempt to `attemptHistory`.
   - **429 / 503** → retryable. Append attempt. If `attempts < 3`: compute backoff (`baseDelayMs * 2^(attempts-1)` or similar, configurable), set `status: "pending"`, `nextAttemptAt: now + backoff`, clear `leaseExpiresAt`. If `attempts === 3`: exhausted → terminal `status: "failed"`, set `lastError`.
   - **422** → permanent. Terminal `status: "failed"` immediately (regardless of attempt count), set `lastError`. Do not touch projection.
5. Release the lease implicitly by having set `status` away from `"claimed"` in the same update that recorded the outcome — never leave a claimed doc lying around after processing; only crash/timeout should leave one claimed.

### Crash/recovery semantics (must be demonstrated in tests)

- If a worker crashes **after** claiming but **before** writing an outcome, `leaseExpiresAt` eventually passes and another worker's claim query picks it up again.
- If a worker crashes **after** updating the `jobs` projection but **before** marking the event `completed`/updating attempt history — decide and document one of:
  - (a) make the projection update idempotent-replayable (it already is, since it's a conditional `$lt` write — replaying it is safe/no-op if version already applied), so on lease-expiry recovery, another worker just re-runs steps 2–5, re-verifies (or skips if you record verification success separately before the projection write), and safely re-marks completion; or
  - (b) split "verify" and "apply" into two idempotent sub-steps with their own recorded state so recovery doesn't re-call the provider unnecessarily.
  Pick (a) for simplicity unless you have time for (b); document attempt-counting implications either way — this maps directly to the required "document whether/how a crashed worker consumes an attempt" note in `DESIGN.md`.
- This scenario is the required "deliberate crash/stop after writing a job projection but before acknowledging work" test — implement a test hook (e.g., a flag/throw injected after the projection write, before the event-completion write) to simulate it deterministically.

---

## 4. Fake provider (`/src/provider`)

- Reads `fixtures/provider-plan.json`, a map/array from event key → planned outcome sequence (e.g., `["503", "success"]` meaning first attempt 503, second attempt succeeds).
- Default (event not listed, or no plan) → immediate success.
- Must be deterministic given the same event and attempt number, so tests are reproducible.
- Backoff/clock: accept an injectable clock or short-delay config for tests so integration tests don't sleep for real minutes.

---

## 5. Read endpoints

### `GET /jobs`
- Require `tenantId`. Optional `sourceId`, `status` (default `active`), `limit` (cap e.g. 100, default e.g. 20), `cursor`.
- Cursor = opaque encoding of the last sort key(s) returned (e.g., base64 of `_id`), not a page number — keeps pagination stable when data changes between pages. Document explicitly: "items added/removed after cursor issuance do not shift already-returned pages; items may or may not appear depending on their position relative to the cursor" — pick one clear rule and state it.

### `GET /events/:eventId`
- Require `tenantId`, `sourceId` as query params (since `eventId` alone isn't globally unique).
- Return status, attempts, attemptHistory (or summarized), lastError, and enough info for a client who got `200`/`409` on `POST /events` to find this record.

### `GET /health`
- Check Mongo connectivity (e.g., `ping` command) with a short timeout.
- Return e.g. `{ status: "ok" | "degraded" | "down", checks: { mongo: "ok" | "down" } }`; document exact meanings in `README.md`.

---

## 6. Fixtures & demo

- `fixtures/demo-scenario.json`: 20 requests total, split into **phase 1** and **phase 2** (phase 2 = delayed/out-of-order events, submitted after phase 1 settles). Cover: valid upserts, invalid inputs, exact replays, conflicting-content reuse, corrected resubmission after a rejected request, cross-tenant/source ID collisions, stale/out-of-order versions, archive-before-upsert, and provider-plan-driven retry/permanent-failure cases.
- `scripts/demo.ts`:
  1. Submit phase 1 requests sequentially or as specified; assert HTTP status at submission time.
  2. Poll (bounded wait) until phase 1 work is fully drained (`pending`/`claimed` counts hit zero, or explicit settle signal).
  3. Submit phase 2 requests; assert HTTP status.
  4. Poll until drained again.
  5. Assert final `jobs` and `events` state matches expectations (print a pass/fail summary).
- Do **not** hardcode fixture IDs inside `/src` business logic — the demo script reads fixture IDs from the fixture file only.

---

## 7. Load test (`scripts/load-test.ts`)

- Generate ≥1,000 distinct valid events across dedicated `tenantId`s like `loadtest-*`.
- Add 200 exact replays of already-sent events.
- Include ≥50 jobs where multiple versions are submitted out of order.
- Fire with configurable concurrency; record: accepted/replay(200)/error counts, submission p50/p95 latency, time until queue fully drains, and a final-state correctness check (spot-check that projections match the highest valid version per job).
- Print/save a report; this feeds the "Run a reproducible local load scenario" deliverable in `SCALE.md`.

---

## 8. Testing checklist (map 1:1 to files under `/test`)

Unit (`/test/unit`, no DB required):
- Payload validation + normalization edge cases (whitespace identifiers, https enforcement, experience range, skills dedupe/order).
- Backoff calculation.
- Canonical hashing / key-order independence, array-order sensitivity.

Integration (`/test/integration`, real Mongo required):
- Duplicate identity: same content → 200 no new doc; different content → 409; concurrent identical POSTs → exactly one insert, others resolve via the duplicate-key path.
- Invalid request doesn't reserve identity; corrected resubmission with same `eventId` succeeds.
- Version races: fire out-of-order versions concurrently at the projection-update layer; assert final `currentVersion` is the max regardless of write order.
- Archive-before-upsert; delayed stale upsert after archive is a no-op.
- Two worker loops running concurrently never double-complete the same event (assert via attempt/claim audit trail).
- Lease expiry recovery: simulate an abandoned claim (manually set `leaseExpiresAt` in the past) and assert a second worker picks it up.
- Retry sequence via provider-plan fixture: 503→503→success within 3 attempts; 422 immediate permanent failure; 3× 429 → exhausted/failed with full attempt history.
- Crash-injection test: kill/throw between projection write and event-completion write; assert recovery converges to correct final state with no duplicate logical job.
- Restart persistence: write state, simulate process restart (new client connection), assert state intact and workers resume correctly.
- Pagination: assert deterministic ordering and the documented behavior when data changes between page fetches.

---

## 9. Config (`.env.example`)

```
MONGO_URI=mongodb://localhost:27017/jobevents
PORT=3000
WORKER_COUNT=2
WORKER_POLL_INTERVAL_MS=200
WORKER_LEASE_MS=15000
RETRY_BASE_DELAY_MS=500
RETRY_MAX_ATTEMPTS=3
```

Keep all tunables here — `DESIGN.md`/`SCALE.md` reference these names when discussing capacity/backoff math.

---

## 10. Order of implementation (suggested)

1. Domain validation/normalization + unit tests.
2. Mongo schema + indexes + `docker-compose.yml`.
3. `POST /events` with idempotency (insert-first pattern) + integration tests for duplicate/conflict races.
4. `jobs` projection conditional-write logic + version/archive tests (can test this directly, without the worker, as pure repository functions first).
5. Fake provider + retry/backoff logic + unit tests.
6. Worker claim/process/recover loop + concurrency + crash-injection integration tests.
7. Read endpoints (`/jobs`, `/events/:id`, `/health`).
8. Fixtures + `demo.ts`.
9. `load-test.ts`.
10. Write `DESIGN.md`, `SCALE.md` (can draft alongside step 1–2, finalize after implementation).
11. `AI_USAGE.md` throughout; `QC_REPORT.md` last, after final code freeze — rerun full test/lint/typecheck/demo/load suite and record actual results tied to the final commit SHA.

---

## 11. Explicit non-negotiables (common ways to fail the assignment)

- Never process the event synchronously inside the `POST /events` handler — accept, persist, return 202, done.
- Never find-then-insert for idempotency — always insert-first, handle the unique-index conflict.
- Never let a worker "own" recovery via in-memory state — recovery must derive purely from Mongo (`leaseExpiresAt`).
- Never let verification failure on a higher version blank out a previously-applied lower version's projection.
- Never mock Mongo for the concurrency/index/claim tests — use a real instance (Docker Compose service).
- Never hardcode fixture IDs into `/src` logic.
- Never skip the final QC pass after the last AI-assisted change, and never claim exactly-once processing in any doc — the guarantee is idempotent *effect*, not exactly-once execution.
