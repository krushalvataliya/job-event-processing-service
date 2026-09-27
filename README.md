# Job Event Processing Service

A high-reliability, distributed backend service built with Node.js 22, TypeScript (strict mode), and MongoDB for ingesting, validating, and asynchronously projecting job postings.

Designed for uncompromising correctness and concurrency safety under duplicate requests, out-of-order event delivery, competing worker pools, and process crashes.

---

## 🚀 Key Features & Architectural Invariants

- **Durable Asynchronous Acceptance**: `POST /events` persists work directly to MongoDB and immediately returns `202 Accepted` without synchronous execution.
- **Insert-First Idempotency**: Atomic writes on `{ tenantId: 1, sourceId: 1, eventId: 1 }`:
  - Identical content replay $\rightarrow$ `200 OK` (no duplicate work).
  - Conflicting payload with same ID $\rightarrow$ `409 Conflict`.
  - Invalid payload $\rightarrow$ `400 Bad Request` without reserving `eventId`.
- **Monotonic Version Projections**: Conditional update `{ currentVersion: { $lt: incomingVersion } }` ensures the highest successfully verified version wins regardless of processing order.
- **Archive Tombstones**: Protects against delayed resurrection from older upserts.
- **Lease-Based Competing Worker Pool**: Atomic `findOneAndUpdate` claim pattern with automated lease-expiration recovery.
- **Deterministic Flaky Verification**: Simulates real-world upstream provider behavior (429/503 retryable with exponential backoff, 422 permanent failure).
- **Strict Tenant Isolation**: All reads and writes are strictly scoped by tenant.

---

## 📦 System Architecture

```
[ Projections / API Clients ]
              ▲
              │ HTTP Read / Health
              │
    ┌─────────┴─────────┐
    │  Fastify REST API  │ ◄─── POST /events (Ingestion)
    └─────────┬─────────┘
              │ (Durable Ingestion)
              ▼
   ┌──────────────────────┐
   │    MongoDB Engine    │
   │  - events collection │ (Audit & Durable Queue)
   │  - jobs collection   │ (Monotonic Projections)
   └──────────┬───────────┘
              ▲
              │ Atomic Lease Claim / Outcome Ack
              │
    ┌─────────┴─────────┐
    │ Background Workers │ ────► Fake Provider Client (provider-plan.json)
    │  (≥2 Competing)   │
    └───────────────────┘
```

---

## 🛠️ Quick Start

### Prerequisites
- Node.js ≥ 22.x LTS
- MongoDB (via Docker Compose or local instance)

### 1. Installation & Environment
```bash
npm install
cp .env.example .env
```

### 2. Start MongoDB
```bash
docker compose up -d
```

### 3. Initialize Database Indexes
```bash
npm run setup
```

### 4. Run Automated Demo & Load Test
```bash
# Run automated 20-request test scenario
npm run demo

# Run load test (1,000+ events, 200 replays, out-of-order versions)
npm run load-test
```

### 5. Start Service
```bash
# Start API Server
npm start

# In separate terminal, start Background Workers
npm run worker
```

---

## 📖 API Reference

### 1. Ingest Event
`POST /events`
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-a",
    "sourceId": "main",
    "eventId": "event-101",
    "externalJobId": "alpha",
    "version": 1,
    "operation": "upsert",
    "payload": {
      "title": "Full Stack Developer",
      "company": "Example Labs",
      "location": "Surat",
      "experienceMin": 1,
      "experienceMax": 3,
      "applyUrl": "https://example.test/jobs/alpha",
      "skills": ["TypeScript", "MongoDB"]
    }
  }'
```

### 2. Inspect Event Status
`GET /events/:eventId?tenantId=...&sourceId=...`
```bash
curl "http://localhost:3000/events/event-101?tenantId=tenant-a&sourceId=main"
```

### 3. List Job Projections
`GET /jobs?tenantId=...&sourceId=...&status=active|archived|all&limit=20&cursor=...`
```bash
curl "http://localhost:3000/jobs?tenantId=tenant-a&status=active&limit=20"
```

### 4. Health Check
`GET /health`
```bash
curl http://localhost:3000/health
```

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP API port |
| `HOST` | `0.0.0.0` | HTTP bind host |
| `MONGO_URI` | `mongodb://localhost:27017/jobevents` | MongoDB connection URI |
| `WORKER_COUNT` | `2` | Number of worker execution loops |
| `WORKER_POLL_INTERVAL_MS` | `200` | Polling interval for workers in ms |
| `WORKER_LEASE_MS` | `15000` | Work claim lease duration in ms |
| `RETRY_BASE_DELAY_MS` | `500` | Exponential backoff base delay in ms |
| `RETRY_MAX_ATTEMPTS` | `3` | Maximum attempts for retryable failures |
| `LOG_LEVEL` | `info` | Structured logging verbosity |

---

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Run database & concurrency integration tests (requires MongoDB)
npm run test:integration

# Run TypeScript compilation check
npm run typecheck
```
