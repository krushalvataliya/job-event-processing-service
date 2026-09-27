# Task 9.1: Developer Portal & API Testing Web UI
Status: DONE

## Objective
Implement an interactive, high-aesthetic web interface served directly at `GET /` on the Fastify server, enabling users and developers to:
1. Review comprehensive architectural invariants and API documentation.
2. Monitor real-time system health, MongoDB latency, and worker telemetry.
3. Test API endpoints directly from the browser (`POST /events`, `GET /events/:eventId`, `GET /jobs`) with pre-configured payload templates (e.g. valid v1, replay duplicate, conflicting payload, out-of-order version, archive tombstone, identifier whitespace error).
4. Inspect real-time event status and explore projected job listings with cursor pagination and status filters.

## Requirements & Design System
- **Route**: `GET /` returns rich HTML/CSS/JS with `Content-Type: text/html`.
- **Aesthetic**:
  - Dark mode with sleek glassmorphism and subtle gradient glow.
  - Curated color palette (deep slate background, violet/cyan primary accents, emerald for success/active, amber for retries/claimed, rose for errors/conflicts).
  - Modern typography (Inter, Fira Code for JSON/code blocks).
  - Smooth tab switching between **Interactive Live Playground** and **API Documentation & Architecture**.
- **Interactive Modules**:
  1. **Live Health Telemetry Bar**: Polls `GET /health` every 5 seconds, displaying real-time MongoDB ping latency, uptime, and connected badge.
  2. **Event Ingestion Form (`POST /events`)**:
     - Quick template buttons: `[Standard Upsert v1]`, `[Duplicate Replay]`, `[Conflict 409]`, `[Out-of-Order v3]`, `[Archive Tombstone]`, `[Whitespace Error 400]`.
     - Live form fields + payload JSON editor.
     - Execute button that displays HTTP status badge, response time, and syntax-highlighted response body.
  3. **Event Audit Tracker (`GET /events/:eventId`)**:
     - Lookup event by ID with tenant scoping.
     - Visual badge showing `pending`, `claimed`, `completed`, or `failed`, with attempt count and lease expiration timer.
  4. **Job Projections Explorer (`GET /jobs`)**:
     - Filter by tenant, source, and status (`active`, `archived`, `all`).
     - Interactive job cards showing title, company, location, current version, skills pills, and timestamps.
  5. **Interactive Documentation Guide**:
     - Explanations of core invariants (insert-first idempotency, monotonic version projection, lease expiry recovery, multi-tenant isolation).
     - Full curl reference and parameter tables.

## Verification Criteria
- [x] `GET /` returns `200 OK` with `Content-Type: text/html`.
- [x] Integration test added in `test/integration/api.test.ts` verifying `GET /` serves HTML containing developer portal elements.
- [x] Browser testing or HTTP verification confirming health checks and interactive actions function properly.
- [x] Task marked as `Status: DONE` and committed.

