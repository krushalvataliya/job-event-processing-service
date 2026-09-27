# Mode 3: Only Node Server in Docker (External MongoDB / Cloud Atlas)

## 📌 Architecture Overview

In **Mode 3**, only the Node.js application layer (Fastify HTTP REST API and background worker pool) runs inside Docker containers. The MongoDB database is hosted externally — such as a managed **MongoDB Atlas** cloud cluster, an existing on-premises replica set, or a MongoDB service running directly on the host.

```
┌────────────────────────────────────────────────────────┐
│  Docker Containers (Application Layer)                 │
│                                                        │
│   ┌─────────────────────────┐  ┌───────────────────┐   │
│   │ jobevents-api-standalone│  │ jobevents-worker- │   │
│   │ (Port 3000:3000)        │  │ standalone        │   │
│   └────────────┬────────────┘  └─────────┬─────────┘   │
└────────────────┼─────────────────────────┼─────────────┘
                 │                         │
                 │   MONGO_URI (TLS/Cloud) │
                 └────────────┬────────────┘
                              ▼
┌────────────────────────────────────────────────────────┐
│  External Database Layer                               │
│  - MongoDB Atlas Cloud Replica Set                     │
│  - AWS DocumentDB / Self-Hosted MongoDB                │
│  - OR Host MongoDB via host.docker.internal:27017      │
└────────────────────────────────────────────────────────┘
```

### Ideal For:
- Production deployments connecting to **MongoDB Atlas**.
- Microservice clusters where database administration is decoupled from application containers.
- Kubernetes / ECS / Nomad container workflows.

---

## ⚙️ Environment Configuration (`.env`)

Configure your `.env` in the project root (or inside `docker/3-node-only/.env`):

### Option A: MongoDB Atlas Cloud (Recommended)
```bash
PORT=3000
HOST=0.0.0.0
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/jobevents?retryWrites=true&w=majority
WORKER_COUNT=2
WORKER_POLL_INTERVAL_MS=200
WORKER_LEASE_MS=15000
RETRY_BASE_DELAY_MS=500
RETRY_MAX_ATTEMPTS=3
LOG_LEVEL=info
```

### Option B: MongoDB Running on Host OS
```bash
PORT=3000
HOST=0.0.0.0
MONGO_URI=mongodb://host.docker.internal:27017/jobevents
WORKER_COUNT=2
LOG_LEVEL=info
```

> **Note on `host.docker.internal`**: The compose file includes `extra_hosts: ["host.docker.internal:host-gateway"]`, allowing the Docker container to seamlessly resolve and connect to services running on your local machine.

---

## 🚀 Actions: Starting and Operating Mode 3

### Step 1: Launch the Node Services in Docker
Ensure `.env` contains your valid `MONGO_URI`.

From the project root:
```bash
docker compose -f docker/3-node-only/docker-compose.yml up -d --build
```
*Or if you are inside `docker/3-node-only/`:*
```bash
docker compose up -d --build
```

### Step 2: Check Container Status
```bash
docker compose -f docker/3-node-only/docker-compose.yml ps
```
Both `jobevents-api-standalone` and `jobevents-worker-standalone` should show `Up`.

### Step 3: Stream Logs
- **API Server Startup & Setup Logs**:
  ```bash
  docker logs -f jobevents-api-standalone
  ```
  *(You will see the database connection established and indexes verified against your external MongoDB)*
- **Worker Pool Logs**:
  ```bash
  docker logs -f jobevents-worker-standalone
  ```

### Step 4: Verify Health & Event Ingestion
- **Check Health Probe**:
  ```bash
  curl http://localhost:3000/health
  ```
  Expected output:
  ```json
  {"status":"ok","db":"connected","uptime":...}
  ```

- **Submit Test Event**:
  ```bash
  curl -X POST http://localhost:3000/events \
    -H "Content-Type: application/json" \
    -d '{
      "tenantId": "atlas-tenant",
      "sourceId": "cloud-api",
      "eventId": "evt-node-only-1",
      "externalJobId": "staff-architect",
      "version": 1,
      "operation": "upsert",
      "payload": {
        "title": "Staff Solutions Architect",
        "company": "Atlas Cloud Labs",
        "location": "Ahmedabad",
        "experienceMin": 5,
        "experienceMax": 10,
        "applyUrl": "https://example.test/jobs/staff-architect",
        "skills": ["MongoDB", "Docker", "Node.js"]
      }
    }'
  ```
  Expected output: `HTTP 202 Accepted`

- **Verify Projection**:
  ```bash
  curl "http://localhost:3000/jobs?tenantId=atlas-tenant&sourceId=cloud-api"
  ```
  Expected output: `HTTP 200 OK`

---

## 🛑 Teardown & Cleanup

- **Stop and Remove Containers**:
  ```bash
  docker compose -f docker/3-node-only/docker-compose.yml down
  ```
