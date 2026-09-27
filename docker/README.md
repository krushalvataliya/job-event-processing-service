# Docker Deployment Architectures & Runbook

This directory contains container configurations and orchestration topologies for running the **Job Event Processing Service** across three operational modes:

| Mode | Directory | Components in Docker | Database Location | Primary Use-Case |
|---|---|---|---|---|
| **Mode 1** | [`1-mongo-only/`](./1-mongo-only/README.md) | MongoDB 7.0 only | Containerized (`localhost:27017`) | Local development with host TypeScript / Vitest test runner |
| **Mode 2** | [`2-full-stack/`](./2-full-stack/README.md) | MongoDB + API + Workers | Containerized (`jobevents-net`) | Turnkey full-stack deployment; isolated bridge network |
| **Mode 3** | [`3-node-only/`](./3-node-only/README.md) | API + Workers only | External (MongoDB Atlas / Host) | Cloud-native production connecting to MongoDB Atlas |

---

## 🧭 Quick Mode Selection Guide

```
                                  Where should MongoDB run?
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
              Inside Docker                                     Outside Docker
                      │                                               │
      ┌───────────────┴───────────────┐                               ▼
      ▼                               ▼                            Mode 3
Node on Host?                   Node in Docker?               (docker/3-node-only)
      │                               │                       API + Workers in Docker
      ▼                               ▼                       connecting to Cloud Atlas
   Mode 1                          Mode 2
(docker/1-mongo-only)       (docker/2-full-stack)
Only Mongo in Docker        Complete Turnkey Stack
```

---

## ⚡ Quick Start Commands (from Project Root)

### Mode 1: Only MongoDB in Docker
```bash
# Start MongoDB container
docker compose -f docker/1-mongo-only/docker-compose.yml up -d

# Run setup & start API on host
npm run setup
npm start

# Teardown
docker compose -f docker/1-mongo-only/docker-compose.yml down
```

### Mode 2: Full-Stack in Docker (MongoDB + Node Server + Workers)
```bash
# Build and launch all 3 services
docker compose -f docker/2-full-stack/docker-compose.yml up -d --build

# Verify health probe
curl http://localhost:3000/health

# Teardown
docker compose -f docker/2-full-stack/docker-compose.yml down -v
```

### Mode 3: Only Node Server in Docker (External MongoDB / Cloud Atlas)
```bash
# Ensure root .env contains your external MONGO_URI (e.g. Atlas connection string)
docker compose -f docker/3-node-only/docker-compose.yml up -d --build

# Verify health probe
curl http://localhost:3000/health

# Teardown
docker compose -f docker/3-node-only/docker-compose.yml down
```

---

## 📂 Directory Layout

```
docker/
├── README.md                      # This master guide
├── Dockerfile                     # Multi-stage production container image
├── 1-mongo-only/
│   ├── docker-compose.yml         # Standalone MongoDB with healthcheck & volume
│   ├── .env.example               # Config connecting host Node to Docker Mongo
│   └── README.md                  # Mode 1 detailed operational guide
├── 2-full-stack/
│   ├── docker-compose.yml         # Mongo + Fastify API + Worker pool on bridge network
│   ├── .env.example               # Config for full container network
│   └── README.md                  # Mode 2 detailed operational guide
└── 3-node-only/
    ├── docker-compose.yml         # Containerized API + Worker pool with external hosts
    ├── .env.example               # Config connecting container to MongoDB Atlas
    └── README.md                  # Mode 3 detailed operational guide
```

---

## 📋 Environment Variables Summary Across Modes

| Environment Variable | Mode 1 (Mongo Only) | Mode 2 (Full Stack) | Mode 3 (Node Only) |
|---|---|---|---|
| `PORT` | `3000` (host) | `3000` (mapped to host) | `3000` (mapped to host) |
| `HOST` | `0.0.0.0` | `0.0.0.0` | `0.0.0.0` |
| `MONGO_URI` | `mongodb://localhost:27017/jobevents` | `mongodb://mongo:27017/jobevents` | `mongodb+srv://...` (Atlas) or `mongodb://host.docker.internal:27017` |
| `WORKER_COUNT` | `2` | `2` | `2` |
| `WORKER_LEASE_MS` | `15000` | `15000` | `15000` |
| `LOG_LEVEL` | `info` | `info` | `info` |
