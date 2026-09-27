# Scalability Architecture & Capacity Model (SCALE.md)

## 1. Traffic Profile & Capacity Sizing

### Ingestion Rates
- **Baseline Scale**: 100,000 events/day
  $$\text{Average Rate} = \frac{100,000}{86,400} \approx 1.16 \text{ events/sec}$$
- **Target Scale**: 10,000,000 events/day
  $$\text{Average Rate} = \frac{10,000,000}{86,400} \approx 115.74 \text{ events/sec}$$
- **Peak Burst Rate**: 5,000 events/sec

### Burst Duration & Drain Math
- **Design Burst Scenario**: A peak burst of 5,000 events/sec sustained for **60 seconds**.
- **Total Backlog Accumulated**:
  $$\text{Backlog} = 5,000 \times 60 = 300,000 \text{ events}$$
- **Target Processing SLA**: All accepted events drained within **5 minutes (300 seconds)**.
- **Required Processing Throughput**:
  $$\text{Throughput} = \frac{300,000 \text{ events}}{300 \text{ seconds}} = 1,000 \text{ events/sec}$$
- **Worker Pool Sizing**:
  - Assuming external verification latency $L = 50\text{ms}$ per event:
  - Throughput per worker thread = $\frac{1000\text{ms}}{50\text{ms}} = 20 \text{ events/sec}$.
  - Worker concurrency required:
    $$N_{\text{workers}} = \frac{1,000}{20} = 50 \text{ concurrent worker loops}$$

---

## 2. Storage, Retention, & Index Sizing

- **Average Raw Payload**: 1 KB per event.
- **7-Day Raw Retention**:
  $$\text{Total Events (7 Days)} = 10,000,000 \times 7 = 70,000,000 \text{ documents}$$
  $$\text{Raw Data Size} = 70,000,000 \times 1\text{ KB} \approx 70\text{ GB}$$
  $$\text{With Index Overhead (+30%)} \approx 91\text{ GB}$$
- **Job Projections Size**:
  - ~1,000,000 active job projections.
  - Average projection doc size: 1 KB.
  - Total Projection Working Set $\approx 1\text{ GB}$ (easily cached in RAM).
- **Automated Retention Strategy**:
  - MongoDB TTL index on `completedAt`:
    ```ts
    db.events.createIndex({ completedAt: 1 }, { expireAfterSeconds: 7 * 86400 });
    ```

---

## 3. MongoDB Sharding & Contention Strategy

- **Shard Key Selection**:
  - Compound shard key: `{ tenantId: 1, externalJobId: 1 }` (or hashed `externalJobId`).
  - Guarantees colocation of all versions for a specific job on a single shard, allowing atomic conditional writes to execute locally without cross-shard distributed transactions.
- **Queue Polling Contention Mitigation**:
  - For massive worker pools, partition the worker polling query by hash bucket or `tenantId` range:
    ```ts
    { status: "pending", tenantBucket: workerBucketId, nextAttemptAt: { $lte: now } }
    ```

---

## 4. Backpressure, Admission Control & Fairness

- **Tenant-Level Token Bucket**: Prevent noisy neighbors from consuming MongoDB write bandwidth.
- **Bounded In-Flight Workers**: Limit active leases to protect MongoDB connection pools.
- **Retry Jitter**: Add randomized jitter ($\pm 20\%$) to exponential backoff to prevent thundering herds on upstream provider recovery.

---

## 5. Architectural Evolution (Inflection Point for Message Broker)

Introduce a dedicated broker (e.g. Apache Kafka or AWS SQS) only when:
1. Sustained write volume exceeds **15,000 events/second** continuously (where MongoDB write locks become the bottleneck).
2. Multiple downstream services require real-time event streaming subscriptions (fan-out architecture).
3. Cross-region multi-datacenter active-active ingestion is required.

---

## 6. Empirical Local Benchmark Results

Measured via `npm run load-test` against live MongoDB:

| Metric | Measured Value | Notes / SLA Compliance |
|---|---|---|
| **Workload Size** | 1,200 HTTP Requests | 1,000 distinct events + 200 exact replays |
| **Out-of-Order Jobs** | 50 jobs (150 events) | Shuffled arrival order |
| **Ingestion Concurrency** | 25 concurrent clients | Promise pool dispatch |
| **Worker Engines** | 4 concurrent loops | Background competing workers |
| **Accepted (`202 Accepted`)** | 1,000 / 1,000 | 100% durable acceptance |
| **Replays (`200 OK`)** | 200 / 200 | 100% idempotent deduplication |
| **Errors (`4xx / 5xx`)** | 0 | 0 dropped requests |
| **Submission Duration** | 15.26 seconds | Overall batch duration |
| **Ingestion Throughput** | 79 req/sec | High-throughput async ingestion |
| **HTTP Latency (p50)** | **53.72 ms** | Well under 100ms SLA |
| **HTTP Latency (p95)** | **946.84 ms** | Sub-second tail latency under load |
| **Queue Drain Time** | 38.86 seconds | Fully drained to 0 backlog |
| **Worker Processing Rate** | 26 events/sec | Steady state with 4 workers |
| **Projection Accuracy** | **100% Match** | All 50 out-of-order jobs converged to version 3 |

