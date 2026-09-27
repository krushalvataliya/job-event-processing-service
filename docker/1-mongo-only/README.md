# Mode 1: Only MongoDB in Docker (Host-Driven Node Development)

## 📌 Architecture Overview

In **Mode 1**, MongoDB runs in a lightweight, containerized environment with persistent storage, while the Node.js Fastify API server, worker pool, and test runners execute directly on your host machine.

```
┌──────────────────────────────────────────────┐
│  Host Machine                                │
│                                              │
│   npm start (API Server) ───┐                │
│   npm run worker (Workers) ─┼────────┐       │
│   npm test (Vitest Suites) ─┘        │       │
│                                      ▼       │
│                        localhost:27017       │
└──────────────────────────────────────┼───────┘
                                       │ Port Mapping
┌──────────────────────────────────────┼───────┐
│  Docker Container (jobevents-mongo)  ▼       │
│  Image: mongo:7.0                            │
│  Data Volume: mongo_data                     │
└──────────────────────────────────────────────┘
```

### Ideal For:
- Active local feature development with instant TypeScript hot-reloading (`npm run dev`).
- Fast test suite iteration (`npm test`, `npm run test:unit`, `npm run test:integration`).
- Running without needing to install a native MongoDB daemon on Windows/macOS/Linux.

---

## ⚙️ Environment Configuration (`.env`)

Place these variables in your root `.env` file (or copy from `docker/1-mongo-only/.env.example`):

```bash
PORT=3000
HOST=0.0.0.0
MONGO_URI=mongodb://localhost:27017/jobevents
WORKER_COUNT=2
WORKER_POLL_INTERVAL_MS=200
WORKER_LEASE_MS=15000
RETRY_BASE_DELAY_MS=500
RETRY_MAX_ATTEMPTS=3
LOG_LEVEL=info
```

> **Key Setting**: `MONGO_URI=mongodb://localhost:27017/jobevents` connects directly to the container's forwarded port `27017`.

---

## 🚀 Actions: Starting and Operating Mode 1

### Step 1: Start MongoDB in Docker
From the project root:
```bash
docker compose -f docker/1-mongo-only/docker-compose.yml up -d
```
*Or if you are inside `docker/1-mongo-only/`:*
```bash
docker compose up -d
```

Verify the container is healthy:
```bash
docker ps --filter "name=jobevents-mongo-standalone"
```

### Step 2: Initialize Database Indexes & Schema
Ensure unique indexes and claim indexes are created:
```bash
npm run setup
```

### Step 3: Start Node.js Services (On Host)
Open two terminal tabs:
- **Terminal 1 (API Server)**:
  ```bash
  npm start
  ```
- **Terminal 2 (Background Worker Pool)**:
  ```bash
  npm run worker
  ```

### Step 4: Verify Health & Run Tests
- **Check Health Probe**:
  ```bash
  curl http://localhost:3000/health
  ```
  Expected output: `{"status":"ok","db":"connected","uptime":...}`

- **Run Automated 20-Request Demo**:
  ```bash
  npm run demo
  ```

- **Run Vitest Integration Suite**:
  ```bash
  npm run test:integration
  ```

---

## 🛑 Teardown & Cleanup

- **Stop MongoDB Container (Preserve Data)**:
  ```bash
  docker compose -f docker/1-mongo-only/docker-compose.yml down
  ```

- **Stop MongoDB Container and Delete Stored Volume**:
  ```bash
  docker compose -f docker/1-mongo-only/docker-compose.yml down -v
  ```
