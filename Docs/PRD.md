# PRD — Job Event Processing Service

## 1. Summary

Build a backend service that ingests job-posting events from external sources, durably queues them, processes them asynchronously through background workers (with simulated external verification, retries, and failure handling), and exposes the resulting current job state through read APIs.

This is a correctness- and reliability-focused system, not a feature-rich product. Success is measured by whether the system behaves correctly under duplication, out-of-order delivery, concurrent workers, and crash/recovery — not by breadth of functionality.

## 2. Goals

- Accept job change events durably and asynchronously (no synchronous end-to-end processing in the request path).
- Guarantee idempotent, replay-safe ingestion.
- Guarantee that job state always reflects the highest successfully verified version, regardless of arrival or processing order.
- Support multiple competing workers with safe claim/complete/recover semantics.
- Simulate a flaky external verification dependency with bounded, backoff-based retries.
- Provide visibility into event processing state and failures.
- Support multi-tenant isolation.
- Be explainable: every design decision should be justifiable in the accompanying docs.

## 3. Non-Goals

- No UI.
- No real external provider integration (fixture-driven fake only).
- No Redis/Kafka/managed queue in the runnable core (MongoDB is the durability layer).
- No production auth/authz implementation (tenantId is a trusted demo input; document the production approach instead).
- No requirement for a hosted/deployed environment.
- No claim of exactly-once processing — only exactly-once *effect* on job state (at-least-once processing is acceptable and expected).

## 4. Users / Consumers

- **Event producers**: external systems submitting job postings/archival events per tenant+source.
- **Read clients / internal tooling**: consumers polling job state and event status.
- **Operators**: consuming `/health`, logs, and failure visibility for on-call/debugging.

## 5. Core Domain Concepts

| Concept | Identity | Notes |
|---|---|---|
| Job | `(tenantId, sourceId, externalJobId)` | Has a monotonically increasing `version`. Can be `active` or `archived`. |
| Event | `(tenantId, sourceId, eventId)` | One semantic change. Immutable once accepted (identity + content). |
| Job Version | integer, positive | Highest successfully verified version wins, regardless of processing order. |
| Archive | a versioned tombstone | Once archived at version N, any upsert with version ≤ N must not reactivate the job. |

## 6. Functional Requirements

### 6.1 Ingestion — `POST /events`

- Validate the event body (see contract below). Invalid → `400`, and the `eventId` is **not** reserved (a corrected retry with the same `eventId` must be accepted).
- Idempotency check (identity = `tenantId+sourceId+eventId`):
  - Same identity + byte-equivalent JSON (ignoring object key order; array order **matters**) → `200`, no new work item created.
  - Same identity + different JSON → `409 Conflict`.
  - New identity, valid → durably persist, return `202` **only after** durable write succeeds. No synchronous downstream processing.
- Replay/idempotency checks happen only for otherwise-valid input; invalid input is rejected before identity reservation.

**Validation rules:**
- `tenantId`, `sourceId`, `eventId`, `externalJobId`: non-blank, reject if they contain leading/trailing whitespace (do not silently trim these identifiers).
- `version`: positive safe integer.
- `operation`: `upsert` | `archive`.
- `upsert` requires `payload`:
  - `title`, `company`, `location`: non-blank after trimming (these *are* trimmed for storage/display).
  - `experienceMin`, `experienceMax`: integers 0–50, `min <= max`.
  - `applyUrl`: must be `https://`.
  - `skills`: array of non-blank strings → normalize to trimmed lowercase, dedupe, preserve first-occurrence order.
- `archive` omits `payload`.

### 6.2 Async Processing — Workers

- ≥2 worker instances/loops must be runnable concurrently, competing for the same backlog.
- Claiming work must be safe under concurrency (no two workers process the same event to completion).
- A crashed/stalled worker's claimed work must be recoverable by another worker after a visibility/lease timeout — recovery must be based on durable state, not in-memory tracking.
- Per event, before applying a **non-stale** change:
  1. Run fake external verification (`fixtures/provider-plan.json` drives the simulated outcome per event).
  2. Default outcome = success.
  3. `429` / `503` → retryable.
  4. `422` → permanent failure.
  5. Max 3 total attempts (including the first), with increasing configurable backoff between attempts. No busy-loop polling.
  6. Stale/lower-or-equal-version work may skip verification and resolve as a no-op.
- On permanent failure or attempt exhaustion: retain a terminal `failed` event record with full attempt history and a useful error message. **Do not mutate the job projection.**
- Version resolution: the job projection reflects the **highest successfully verified version only**. A higher version's verification failure must not hide a lower version's previously-applied success. A later, successful higher version can subsequently overwrite it.
- Archive-before-upsert: an archive event may arrive with no prior upsert for that job; the tombstone must still be recorded and enforced against subsequent lower/equal-version upserts.

### 6.3 Reads

- `GET /jobs?tenantId=...&sourceId=...&status=active|archived|all&limit=...&cursor=...`
  - Tenant-scoped (required), source filter optional.
  - Default `status=active`. Capped page size. Deterministic pagination (define and document behavior when underlying data mutates between pages — e.g., cursor is stable/tie-broken by an immutable key).
- `GET /events/:eventId?tenantId=...&sourceId=...`
  - Returns acceptance/processing status, attempt count, last error.
  - Must allow a caller who received a `200`/`409` duplicate response to look up the original accepted event.
- `GET /health`
  - Reports service + MongoDB dependency readiness with clearly documented status values (e.g., `ok` / `degraded` / `down`).

Equivalent endpoint contracts are acceptable if clearly documented as such.

### 6.4 Isolation

- Identical `sourceId`/`externalJobId`/`eventId` values in different tenants are entirely independent.
- Every read is tenant-scoped; there is no cross-tenant leakage in any response.

## 7. Non-Functional Requirements

- **Durability**: no accepted event or completed job state can be lost on process crash.
- **Concurrency safety**: correct behavior under concurrent duplicate submissions and concurrent worker claims — validated with a real MongoDB integration test, not mocks.
- **Recoverability**: demonstrable recovery of a worker's in-flight work after a deliberate crash/stop, without producing a duplicate logical job or losing the projection update.
- **Observability**: attempt history, error visibility per event, health status.
- **Scalability path**: documented (not necessarily implemented) scaling story from 100K events/day to 10M events/day with 5K events/sec bursts, 5-minute processing SLA at design capacity, 1KB avg payload, 7-day raw event retention, ~1M job projections.

## 8. Acceptance Criteria (maps to demo/test scenario)

1. Setup + demo run via one documented command each; demo executes the 20-request fixture in order, waits for phase 1 to settle, submits delayed phase 2 events, waits again, checks HTTP status at submission time and final state after draining.
2. Executable tests cover: validation, normalization, duplicate replay, conflicting reuse, corrected reuse after rejection, tenant/source isolation, out-of-order versions (incl. archive-before-upsert, delayed stale updates), retry success/permanent failure/exhaustion with visible attempts, concurrent duplicate requests, concurrent workers, crash-before-ack recovery, restart persistence, pagination boundaries.
3. A real MongoDB integration test validates unique indexes, version races, claim/recovery.
4. Load scenario: ≥1,000 distinct valid events + 200 exact replays + ≥50 out-of-order-version jobs, on dedicated load-test tenant IDs, with recorded concurrency, accepted/replay/error counts, p50/p95 latency, final-state checks, drain time.

## 9. Deliverables

- Git repo: source, lockfile, Docker Compose, `.env.example`, tests, fixtures, scripts.
- `README.md`, `DESIGN.md`, `SCALE.md`, `AI_USAGE.md`, `QC_REPORT.md` (optionally `DEMO.md`).
- Meaningful commit history including an early design note and a final QC commit.

## 10. Risks / Explicitly Deferred (document, don't necessarily build)

- Conflicting content for the same `(job, version)` outside the fixture contract.
- Production tenant authentication/authorization.
- Whether/how a crashed worker consumes a retry attempt, and why.
- Sharding/partitioning strategy and hot-key mitigation at 10M events/day.
