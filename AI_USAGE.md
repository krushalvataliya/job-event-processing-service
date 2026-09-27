# AI Usage & Engineering Governance Log (AI_USAGE.md)

## 1. Overview & Standards
This document records AI-assisted development across the codebase, detailing human architectural review, modifications, and independent verification methods.

---

## 2. Interaction Log

| Task / Artifact | AI Tool & Model | Human Intent / Prompt Summary | Code Accepted vs Modified | Independent Verification Method |
|---|---|---|---|---|
| **Phase 0: Scaffold & Setup** | Gemini 3.8 Flash | Scaffold Node 22, TypeScript strict mode, Zod config, and Docker Compose. | Accepted typed config structure; adjusted environment variable fallback for Mongo URI; added strict validation rules. | Ran `npm run typecheck`, `npm test`, verified Docker configuration syntax. |
| **Phase 1: Domain Logic** | Gemini 3.8 Flash | Implement canonical JSON hashing and normalization functions. | Enforced strict whitespace rejection without silent trimming on identifiers; verified key sorting and array preservation. | Hermetic unit tests in `test/unit/` covering permutations and edge cases (28 unit tests). |
| **Phase 2: Database Layer** | Gemini 3.8 Flash | Repositories for atomic insert-first idempotency, lease claiming, and monotonic projection updates. | Enforced single atomic conditional write `{ currentVersion: { $lt: version } }`; added duplicate key error recovery; handled archive tombstones. | Real MongoDB integration tests in `test/integration/` (indexes, unique constraints, concurrent races). |
| **Phase 3: Worker Engine** | Gemini 3.8 Flash | Competing worker execution loops, exponential backoff, and fake provider client. | Added staleness pre-check to bypass external provider; added `crashHook` to test crash-before-ack recovery deterministically. | Worker integration tests verifying multi-worker concurrency, retry progression, permanent failure, and crash recovery. |
| **Phase 4: HTTP API** | Gemini 3.8 Flash | Fastify HTTP routes for `/events`, `/jobs`, `/health`. | Refactored Fastify error handling typing to `FastifyError`; verified tenant isolation on all queries; ensured 202 accepted before background execution. | Full API integration tests covering 202, 200, 409, 400, 404, and tenant isolation. |
| **Phase 5: Fixtures & Demo** | Gemini 3.8 Flash | 20-request end-to-end demo script covering all edge cases. | Structured Phase 1 (14 requests) and Phase 2 (6 requests) with automated settling detection and assertions. | Executed `npm run demo` — 29/29 assertions passed (100%). |
| **Phase 6: Load Testing** | Gemini 3.8 Flash | Synthetic workload generator (1,000 events, 200 replays, 50 out-of-order jobs). | Adjusted drain polling loop to guarantee 0 remaining backlog; instrumented p50 and p95 latency. | Executed `npm run load-test` — 1,200 requests, 0 errors, 100% projection consistency. |
| **Phase 7: Governance & QC** | Gemini 3.8 Flash | Architecture design, scaling math, and quality control report. | Challenged 3 failure hypotheses; linked test results to git commit SHA. | Full test suite re-execution (`npm test`). |

---

## 3. Human Architectural Critique & Verification
- **Identifier Whitespace Verification**: Verified that `tenantId`, `sourceId`, `eventId`, and `externalJobId` reject leading/trailing spaces with `400 Bad Request` rather than silently calling `.trim()`.
- **Insert-First Idempotency**: Verified that `POST /events` directly calls `insertOne` and catches duplicate key error 11000 rather than checking with `findOne` first, preventing concurrency races.
- **Monotonic Version Boundary**: Confirmed that atomic conditional updates in MongoDB replace complex distributed locks or 2PC transactions.
- **Durable Recovery**: Proved that recovering from an unhandled worker process crash relies strictly on `leaseExpiresAt` in MongoDB rather than in-memory volatile state.
