# Task 7.2: Scalability Analysis Document (SCALE.md)
Status: TODO

## Objective
Author the comprehensive `SCALE.md` document delivering mathematical modeling and architectural scaling plans from 100,000 events/day to 10,000,000 events/day with 5,000 events/sec bursts.

## Background & Requirements
Per PRD §7 & §8:
`SCALE.md` must thoroughly cover:
1. **Mathematical Traffic & Capacity Modeling**:
   - Baseline: 100K events/day $\rightarrow \approx 1.16$ events/sec average.
   - Target scale: 10M events/day $\rightarrow \approx 116$ events/sec average.
   - Burst scale: 5,000 events/sec peak.
   - **Crucial**: Burst duration! State how long the architecture can sustain a 5,000 eps burst (e.g. 60 seconds burst = 300,000 events backlog).
   - SLA: Process accepted events within 5 minutes under design capacity.
   - Worker capacity calculations: Number of workers needed, latency per worker task, throughput calculations, and queue drain time math ($T_{\text{drain}} = \text{Backlog} / (\text{Throughput} - \text{Incoming})$).
2. **Storage, Retention & Index Sizing**:
   - 1 KB average raw event payload.
   - 7-day raw event retention $\rightarrow 10\text{M} \times 7 = 70\text{M}$ documents $\rightarrow \approx 70\text{GB}$ raw data + index overhead.
   - TTL index strategy on `completedAt` / `createdAt` for automated cleanup.
   - Projections: ~1M current job projections $\rightarrow \approx 1\text{GB}$ working set (fits easily in RAM).
3. **MongoDB Contention, Sharding & Hot Keys**:
   - Single collection polling contention at 5,000 eps burst.
   - Compound index performance: `{ status: 1, nextAttemptAt: 1 }`.
   - Sharding strategy: Shard key choice (`tenantId` vs hashed `(tenantId, externalJobId)`).
   - Hot tenant / hot key mitigation.
4. **Admission Control, Backpressure & Fairness**:
   - Token bucket rate limiting per tenant.
   - Preventing retry storms via jitter and capped backoff.
   - Bounded concurrency to protect MongoDB connection pool.
5. **Observability, Metrics & Alerting**:
   - Key SLIs/SLOs: Ingestion latency (p95 < 50ms), queue lag (< 5 minutes), retry error rates, MongoDB CPU/connection saturation.
6. **Architecture Evolution (When to introduce Kafka / RabbitMQ)**:
   - Specific, quantifiable inflection points: When to separate the ingestion buffer (Kafka/RabbitMQ) from the MongoDB state store (e.g. sustained writes > 10,000 eps, cross-region replication, multiple consumer teams).
7. **Empirical Local Load Test Results**:
   - Document the real measured values from `scripts/load-test.ts` (machine, throughput, p50/p95, drain time).

## Detailed Steps

1. **Perform Exact Mathematical Derivations**:
   - Calculate concrete numbers for rates, queues, memory, and disk IOPS.
2. **Structure `SCALE.md`**:
   - Use structured tables, equations, and clear diagrams.

## Verification Criteria
- [ ] No hand-waving; all claims backed by calculations.
- [ ] Explicitly defines burst duration and drain math.
- [ ] Includes real measured benchmark from local test run.
