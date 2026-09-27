# Mode 2: Full-Stack in Docker (MongoDB + Node Server + Workers)

## 📌 Architecture Overview

In **Mode 2**, the entire system runs inside Docker. MongoDB, the Fastify HTTP API server, and the background worker pool are orchestrated inside an isolated container network (`jobevents-net`).

```
┌────────────────────────────────────────────────────────────────────────┐
│  Docker Bridge Network: jobevents-net                                  │
│                                                                        │
│   ┌───────────────────────┐             ┌─────────────────────────┐    │
│   │ jobevents-api-full    │             │ jobevents-worker-full   │    │
│   │ (Fastify REST Server) │             │ (Worker Pool Count: 2)  │    │
│   └──────────┬────────────┘             └────────────┬────────────┘    │
│              │                                       │                 │
│              │ mongodb://mongo:27017/jobevents       │                 │
│              └───────────────────┬───────────────────┘                 │
│                                  ▼                                     │
│                     ┌─────────────────────────┐                        │
│                     │ jobevents-mongo-full    │                        │
│                     │ (MongoDB 7.0 + Indexes) │                        │
│                     └─────────────────────────┘                        │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ Exposed to Host
                                   ▼
             Host Machine: http://localhost:3000 (API & Health)
```

### Ideal For:
- Production or staging turnkey deployments.
- Complete containerized verification without any Node.js or MongoDB runtime needed on the host.
- CI/CD automated integration pipelines.

---

## ⚙️ Environment Configuration (`.env`)

Inside `jobevents-net`, the Node server and worker access MongoDB using the service name `mongo`:

```bash
PORT=3000
HOST=0.0.0.0
MONGO_URI=mongodb://mongo:27017/jobevents
WORKER_COUNT=2
WORKER_POLL_INTERVAL_MS=200
WORKER_LEASE_MS=15000
RETRY_BASE_DELAY_MS=500
RETRY_MAX_ATTEMPTS=3
LOG_LEVEL=info
```

> **Key Setting**: `MONGO_URI=mongodb://mongo:27017/jobevents` uses Docker's internal DNS resolution. The API server maps port `3000` to your host machine (`http://localhost:3000`).

---

## 🚀 Actions: Starting and Operating Mode 2

### Step 1: Build and Launch the Full Stack
From the project root:
```bash
docker compose -f docker/2-full-stack/docker-compose.yml up -d --build
```
*Or if you are inside `docker/2-full-stack/`:*
```bash
docker compose up -d --build
```

### Step 2: Check Container Status
Verify all three services are running:
```bash
docker compose -f docker/2-full-stack/docker-compose.yml ps
```
You should see:
- `jobevents-mongo-full` (healthy)
- `jobevents-api-full` (running on 0.0.0.0:3000)
- `jobevents-worker-full` (running background workers)

### Step 3: Stream Container Logs
- **API Server Logs**:
  ```bash
  docker logs -f jobevents-api-full
  ```
- **Worker Pool Logs**:
  ```bash
  docker logs -f jobevents-worker-full
  ```

### Step 4: Verify Health Probe
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{"status":"ok","db":"connected","uptime":1.2}
```

### Step 5: Test Ingestion and Asynchronous Processing
Submit an event to the containerized API:
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "prod-tenant",
    "sourceId": "portal",
    "eventId": "evt-docker-1",
    "externalJobId": "lead-sre",
    "version": 1,
    "operation": "upsert",
    "payload": {
      "title": "Lead Site Reliability Engineer",
      "company": "Cloud Corp",
      "location": "Remote",
      "experienceMin": 4,
      "experienceMax": 8,
      "applyUrl": "https://cloudcorp.test/jobs/lead-sre",
      "skills": ["Docker", "Kubernetes", "TypeScript"]
    }
  }'
```
Expected response: `HTTP 202 Accepted`

Query the projected job:
```bash
curl "http://localhost:3000/jobs?tenantId=prod-tenant&sourceId=portal"
```
Expected response: `HTTP 200 OK` with the active projected job!

---

## 🛑 Teardown & Cleanup

- **Stop All Containers (Preserve Data)**:
  ```bash
  docker compose -f docker/2-full-stack/docker-compose.yml down
  ```

- **Stop All Containers and Wipe Database Volumes**:
  ```bash
  docker compose -f docker/2-full-stack/docker-compose.yml down -v
  ```
