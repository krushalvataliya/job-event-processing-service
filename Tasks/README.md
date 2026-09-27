# Job Event Processing Service — Master Tasks Index

Welcome to the implementation task roadmap for the **Job Event Processing Service** — a high-reliability, distributed job ingestion and projection platform.

This roadmap organizes the entire implementation into **8 distinct phases** and **33 granular task files**. Each task file is self-contained with explicit technical specifications, code boundaries, invariants, edge cases, and verification criteria.

---

## 🎯 Project Core Objectives & Invariants

1. **Durable Asynchronous Acceptance**: `POST /events` persists first to MongoDB, returning `202 Accepted` immediately without synchronous worker execution.
2. **Replay & Idempotency Safety**: Atomic insert-first pattern via unique index `{ tenantId: 1, sourceId: 1, eventId: 1 }`.
   - Same identity + byte-equivalent JSON (key-order independent canonical hash) $\rightarrow$ `200 OK` (no duplicate work).
   - Same identity + differing JSON $\rightarrow$ `409 Conflict`.
   - Invalid payload $\rightarrow$ `400 Bad Request` without reserving `eventId` (corrected reuse allowed).
3. **Monotonic Version Projection**: Highest successfully verified version wins for `(tenantId, sourceId, externalJobId)`, regardless of arrival or worker completion order.
   - Enforced via single atomic conditional update `currentVersion: { $lt: incomingVersion }`.
   - Archive writes tombstone `archivedAtVersion: max(archivedAtVersion, incomingVersion)`.
   - Stale/delayed lower or equal versions are processed as no-op completions.
4. **Competing Worker Pool with Lease Recovery**: Multiple workers compete safely via atomic `findOneAndUpdate` claims. Abandoned or crashed work recovers automatically after `leaseExpiresAt`.
5. **Simulated Flaky Verification**: Controlled via `fixtures/provider-plan.json` (429/503 retryable with exponential backoff up to 3 attempts, 422 permanent failure).
6. **Multi-Tenant Isolation**: Identical IDs across tenants are strictly isolated. All reads are scoped by `tenantId`.

---

## 📋 Phase & Task Directory Structure

```
Tasks/
├── README.md                                    # This master index
├── phase-0-setup/
│   ├── task-0.1-project-scaffold-and-dependencies.md
│   ├── task-0.2-env-config-and-docker-compose.md
│   └── task-0.3-documentation-and-git-blueprint.md
├── phase-1-domain/
│   ├── task-1.1-domain-models-and-zod-schemas.md
│   ├── task-1.2-payload-normalization-rules.md
│   ├── task-1.3-canonical-payload-hashing.md
│   └── task-1.4-domain-unit-tests.md
├── phase-2-database/
│   ├── task-2.1-mongo-connection-and-health-probe.md
│   ├── task-2.2-mongo-indexes-and-schema-management.md
│   ├── task-2.3-events-repository-insert-first-and-claiming.md
│   ├── task-2.4-jobs-repository-conditional-projection.md
│   └── task-2.5-database-integration-tests.md
├── phase-3-worker/
│   ├── task-3.1-fake-provider-and-provider-plan-loader.md
│   ├── task-3.2-retry-and-backoff-engine.md
│   ├── task-3.3-worker-polling-and-processing-loop.md
│   ├── task-3.4-lease-expiry-recovery-and-crash-injection.md
│   └── task-3.5-worker-concurrency-and-recovery-tests.md
├── phase-4-api/
│   ├── task-4.1-http-server-setup-and-middleware.md
│   ├── task-4.2-post-events-idempotent-ingestion.md
│   ├── task-4.3-get-event-status-by-id.md
│   ├── task-4.4-get-jobs-cursor-pagination-and-filtering.md
│   ├── task-4.5-get-health-readiness-probe.md
│   └── task-4.6-api-contract-and-isolation-tests.md
├── phase-5-fixtures-and-demo/
│   ├── task-5.1-provider-plan-fixture-definition.md
│   ├── task-5.2-demo-scenario-20-requests-fixture.md
│   ├── task-5.3-automated-demo-script-phase1-and-phase2.md
│   └── task-5.4-demo-verification-and-output-snapshot.md
├── phase-6-load-testing/
│   ├── task-6.1-load-test-generator-and-orchestrator.md
│   ├── task-6.2-latency-throughput-and-drain-instrumentation.md
│   └── task-6.3-load-execution-and-results-capture.md
└── phase-7-deliverables-and-qc/
    ├── task-7.1-architecture-design-document-DESIGN-md.md
    ├── task-7.2-scalability-analysis-document-SCALE-md.md
    ├── task-7.3-readme-and-demo-walkthrough-guide.md
    ├── task-7.4-ai-usage-tracking-AI_USAGE-md.md
    └── task-7.5-post-generation-qc-pass-and-QC_REPORT-md.md
```

---

## 🗺️ Execution Roadmap Summary

| Phase | Focus Area | Key Deliverable | Tasks |
|---|---|---|---|
| **Phase 0** | Setup & Infrastructure | Node 22 + TS Strict, Docker Compose MongoDB, Linters, Git Setup | 3 Tasks |
| **Phase 1** | Pure Domain Logic | Validation, Normalization, Canonical Hashing, Unit Tests | 4 Tasks |
| **Phase 2** | Persistence Layer | MongoDB Collections, Unique Indexes, Repositories, DB Tests | 5 Tasks |
| **Phase 3** | Worker & Engine | Claim Loop, Backoff, Fake Provider, Concurrency & Crash Recovery | 5 Tasks |
| **Phase 4** | HTTP API Layer | Fastify/HTTP Routes (`/events`, `/jobs`, `/health`), Integration Tests | 6 Tasks |
| **Phase 5** | Fixtures & Demo Script | 20-Request Scenario, Provider Plan, Automated `demo.ts` | 4 Tasks |
| **Phase 6** | Load & Performance Testing | 1,000+ Events, 200 Replays, Out-of-Order Versions, Latency Profiling | 3 Tasks |
| **Phase 7** | Docs & Quality Control | `DESIGN.md`, `SCALE.md`, `README.md`, `AI_USAGE.md`, `QC_REPORT.md` | 5 Tasks |

---

## 🚦 Implementation Protocol

1. **Step-by-step Execution**: Execute tasks in numeric order. Do not skip tasks.
2. **Never Mock MongoDB for Integration Tests**: Concurrency, unique indexes, conditional writes, and claim lease recovery must test against real MongoDB.
3. **Commit Integrity**: Commit code incrementally with clear, descriptive commit messages matching task identifiers.
