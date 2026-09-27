# Task 4.5: GET /health (Readiness Probe)
Status: DONE

## Objective
Implement `GET /health` route returning detailed service and database readiness with clear documented status codes.

## Background & Requirements
Per PRD §6.3 & IMPLEMENTATION_GUIDE.md §5:
- Reports application readiness and downstream MongoDB connection status.
- Documented status semantics:
  - `"ok"` (HTTP 200): Service is accepting traffic; MongoDB ping succeeded within timeout.
  - `"degraded"` or `"down"` (HTTP 503): MongoDB ping failed or timed out; service cannot durably accept writes.
- Payload format:
  ```json
  {
    "status": "ok",
    "uptimeSeconds": 142.5,
    "timestamp": "2026-09-27T10:00:00.000Z",
    "checks": {
      "mongodb": {
        "status": "ok",
        "latencyMs": 4
      }
    }
  }
  ```

## Detailed Steps

1. **Add Route Handler in `src/api/routes/health.ts`**:
   - Call `checkMongoHealth()`.
   - Set HTTP 200 if MongoDB is `ok`; otherwise HTTP 503.
   - Return structured status object.

## Verification Criteria
- [ ] Returns HTTP 200 with `status: "ok"` when MongoDB is running.
- [ ] Returns HTTP 503 with `status: "down"` if MongoDB connection is dropped.
- [ ] Latency is measured in milliseconds.
