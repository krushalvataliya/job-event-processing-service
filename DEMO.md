# End-to-End Demo Walkthrough Guide (DEMO.md)

## Overview
This walkthrough demonstrates the end-to-end execution of the **Job Event Processing Service** using the automated test scenario script:
```bash
npm run demo
```

The script executes 20 carefully curated requests split into **Phase 1** and **Phase 2**, observing HTTP status codes at submission time and verifying final database projections and audit trails after workers drain the queue.

---

## 🏃 Execution Commands

### 1. Initialize System & Indexes
```bash
npm run setup
```
- Connects to MongoDB.
- Creates unique indexes on `events` and `jobs`.
- Resets demo test collections cleanly.

### 2. Run Automated Scenario
```bash
npm run demo
```

---

## 🔍 Scenario Sequence & Verifications

### Phase 1: Initial Ingestion & Concurrency
1. **Valid Upsert v1** $\rightarrow$ `202 Accepted`.
2. **Exact Duplicate Replay** $\rightarrow$ `200 OK` (no new work queued).
3. **Conflicting Replay (modified title)** $\rightarrow$ `409 Conflict`.
4. **Invalid Request (whitespace in tenantId)** $\rightarrow$ `400 Bad Request` (ID not reserved).
5. **Corrected Resubmission reusing eventId** $\rightarrow$ `202 Accepted`.
6. **Cross-Tenant Collision** $\rightarrow$ `202 Accepted` (isolated in tenant-b).
7. **Cross-Source Collision** $\rightarrow$ `202 Accepted` (isolated in source-b).
8. **Out-of-Order Version (v3 submitted before v2)** $\rightarrow$ `202 Accepted`.
9. **Archive-Before-Upsert (archive at v2)** $\rightarrow$ `202 Accepted`.
10. **Transient Upstream Failure (503 $\rightarrow$ 503 $\rightarrow$ success)** $\rightarrow$ `202 Accepted`.
11. **Permanent Upstream Failure (422)** $\rightarrow$ `202 Accepted`.
12. **Upstream Rate-Limit Exhaustion (429 $\times$ 3)** $\rightarrow$ `202 Accepted`.

*Phase 1 Draining: Workers process all events. Settle detected.*

### Phase 2: Delayed & Out-of-Order Events
13. **Delayed Stale Upsert v2 (submitted after v3 settled)** $\rightarrow$ `202 Accepted` (Worker skips as no-op; projection stays at v3).
14. **Delayed Stale Upsert v1 on Archived Job** $\rightarrow$ `202 Accepted` (Worker detects tombstone v2; no reactivation).
15. **Valid Upsert v4 on Archived Job** $\rightarrow$ `202 Accepted` (Reactivates job to active status).
16. **Failed Upsert v5 (verification fails 422)** $\rightarrow$ `202 Accepted` (Worker fails event; projection remains at valid v4).

*Phase 2 Draining: Workers process all delayed events.*

### Final Verification
- Compares every job in `jobs` collection against expected monotonic version and status.
- Compares attempt counts and failure records in `events` collection.
- Prints PASS/FAIL summary table.
