# End-to-End Demo Walkthrough Guide (DEMO.md)

## Overview
This walkthrough demonstrates the end-to-end execution of the **Job Event Processing Service** using the automated test scenario script:
```bash
npm run demo
```

The script executes 20 curated requests split into **Phase 1** and **Phase 2**, observing HTTP status codes at submission time and verifying final database projections and audit trails after workers drain the queue.

---

## 🏃 Execution Commands

### 1. Initialize Database & Indexes
```bash
npm run setup
```
Output:
```
> job-event-processing-service@1.0.0 setup
> tsx scripts/setup.ts

🚀 Running Job Event Processing Service Database Setup...
✅ Connected to MongoDB
✅ Health check status: ok (23ms latency)
🔨 Ensuring required indexes...
✅ Unique and query indexes verified on `events` and `jobs` collections
🎉 Setup completed successfully!
```

### 2. Run Automated Scenario
```bash
npm run demo
```

Actual verified execution log:
```
> job-event-processing-service@1.0.0 demo
> tsx scripts/demo.ts

═══════════════════════════════════════════════════════════════════
   JOB EVENT PROCESSING SERVICE — AUTOMATED END-TO-END DEMO        
═══════════════════════════════════════════════════════════════════

🧹 Purging previous demo tenant records...
✅ Demo test state clean.

👥 Worker pool started: [demo-worker-1, demo-worker-2] actively competing for tasks.

───────────────────────────────────────────────────────────────────
  Submitting PHASE 1 (14 Requests)
───────────────────────────────────────────────────────────────────
  [Step 01] ✅ HTTP 202 | Valid initial upsert v1
  [Step 02] ✅ HTTP 200 | Exact duplicate replay of step 1
  [Step 03] ✅ HTTP 409 | Conflicting payload reuse of eventId demo-evt-01
  [Step 04] ✅ HTTP 400 | Invalid request: whitespace in identifier
  [Step 05] ✅ HTTP 202 | Corrected resubmission reusing demo-evt-04-whitespace
  [Step 06] ✅ HTTP 202 | Cross-tenant isolation: identical IDs in secondary tenant
  [Step 07] ✅ HTTP 202 | Cross-source isolation: identical externalJobId in partner source
  [Step 08] ✅ HTTP 202 | Out-of-order version arrival: v3 arrives before v2
  [Step 09] ✅ HTTP 202 | Archive-before-upsert tombstone created at v2
  [Step 10] ✅ HTTP 202 | Transient upstream 503 recovering on 3rd attempt
  [Step 11] ✅ HTTP 202 | Permanent upstream verification failure (422)
  [Step 12] ✅ HTTP 202 | Upstream rate-limit exhaustion (3x 429)
  [Step 13] ✅ HTTP 202 | Initial valid state v1 for higher-version failure test
  [Step 14] ✅ HTTP 202 | Initial active state v1 for reactivation test

⏳ Waiting for Phase 1 queue to drain across demo workers...
✨ Phase 1 successfully settled in 1.14s (backlog = 0).

───────────────────────────────────────────────────────────────────
  Submitting PHASE 2 (6 Requests)
───────────────────────────────────────────────────────────────────
  [Step 15] ✅ HTTP 202 | Delayed stale upsert v2 arriving after v3 has settled
  [Step 16] ✅ HTTP 202 | Delayed stale upsert v1 rejected by archive tombstone v2
  [Step 17] ✅ HTTP 202 | Archive event v2 archiving active job
  [Step 18] ✅ HTTP 202 | Higher upsert v3 reactivating archived job
  [Step 19] ✅ HTTP 202 | Higher version v2 verification failure preserves v1 projection
  [Step 20] ✅ HTTP 200 | Exact replay check on Phase 2 reactivation

⏳ Waiting for Phase 2 queue to drain across demo workers...
✨ Phase 2 successfully settled in 0.28s (backlog = 0).

───────────────────────────────────────────────────────────────────
  FINAL VERIFICATION OF PROJECTIONS & ATTEMPT AUDIT TRAILS
───────────────────────────────────────────────────────────────────
  ✅ PASS: demo-job-alpha reflects version 1 and active status
  ✅ PASS: demo-job-ooo reflects version 3 (stale v2 was skipped)
  ✅ PASS: demo-job-archived-first reflects tombstone v2 (delayed v1 blocked)
  ✅ PASS: demo-job-reactivate reflects version 3 active (upsert -> archive -> reactivate)
  ✅ PASS: demo-job-higher-fail preserves lower version 1 (higher v2 failure kept v1 intact)
  ✅ PASS: demo-evt-10 (transient 503) succeeded after 3 attempts
  ✅ PASS: demo-evt-11 (permanent 422) failed immediately without creating projection
  ✅ PASS: demo-evt-12 (rate-limit 429) exhausted retries after 3 attempts
  ✅ PASS: Cross-tenant isolation: demo-tenant-secondary job is completely independent

═══════════════════════════════════════════════════════════════════
  DEMO RESULT: 29/29 ASSERTIONS PASSED (100%)
═══════════════════════════════════════════════════════════════════
```
