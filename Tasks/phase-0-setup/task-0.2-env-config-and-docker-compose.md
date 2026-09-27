# Task 0.2: Environment Configuration and Docker Compose

## Objective
Establish reproducible environment configuration, strongly-typed config loading, and a Docker Compose specification for running local MongoDB.

## Background & Requirements
- A single MongoDB instance is required for local development, integration testing, and running demo/load tests.
- All system tunables (worker leases, polling intervals, retry counts, base backoff) must be centrally managed through environment variables and validated with Zod.
- `.env.example` must contain documented, working default values.

## Detailed Steps

1. **Create `docker-compose.yml`**:
   - Service: `mongo`
   - Image: `mongo:7.0` (or `mongo:latest`)
   - Ports: `27017:27017`
   - Environment: standard unauthenticated local dev setup (e.g. `MONGO_INITDB_DATABASE: jobevents`)
   - Volumes: named volume `mongo_data:/data/db`
   - Healthcheck: `test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]`, interval: 5s, timeout: 5s, retries: 5.

2. **Create `.env.example`**:
   ```env
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

3. **Create `src/config/index.ts`**:
   - Define a Zod schema validating all environment variables:
     - `PORT`: coerced integer, default 3000.
     - `HOST`: string, default "0.0.0.0".
     - `MONGO_URI`: valid URI string, default "mongodb://localhost:27017/jobevents".
     - `WORKER_COUNT`: positive integer >= 1, default 2.
     - `WORKER_POLL_INTERVAL_MS`: positive integer, default 200.
     - `WORKER_LEASE_MS`: positive integer, default 15000.
     - `RETRY_BASE_DELAY_MS`: positive integer, default 500.
     - `RETRY_MAX_ATTEMPTS`: positive integer, default 3.
     - `LOG_LEVEL`: enum `["debug", "info", "warn", "error"]`, default "info".
   - Export an immutable typed `config` object.
   - Throw descriptive validation error if required variables are missing or malformed.

## Verification Criteria
- [ ] `docker compose up -d` boots MongoDB and passes healthcheck.
- [ ] Running `tsx -e "import { config } from './src/config'; console.log(config);"` parses `.env` or defaults without error.
- [ ] Invalid environment variables (e.g. non-numeric `PORT`) fail fast with a clear Zod validation error message.
