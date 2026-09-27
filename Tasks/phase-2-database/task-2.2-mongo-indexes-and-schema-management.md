# Task 2.2: MongoDB Indexes and Schema Management
Status: DONE

## Objective
Define and create the required indexes across `events` and `jobs` collections, and build an initialization routine that guarantees schema and index consistency at service boot.

## Background & Requirements
Per PRD §6.1, §6.2, §6.3 & IMPLEMENTATION_GUIDE.md §1:

### 1. Collection `events`:
- **Unique Ingestion Index**:
  - Key: `{ tenantId: 1, sourceId: 1, eventId: 1 }`
  - Unique: `true`
  - Purpose: Enforce idempotency and prevent duplicate inserts at the database engine level.
- **Worker Claim Query Index**:
  - Key: `{ status: 1, nextAttemptAt: 1 }`
  - Purpose: Fast retrieval of next pending or expired-lease events sorted by `nextAttemptAt`.
- **Lookup Index**:
  - Key: `{ tenantId: 1, sourceId: 1, eventId: 1 }` (satisfied by unique index).

### 2. Collection `jobs`:
- **Unique Job Identity Index**:
  - Key: `{ tenantId: 1, sourceId: 1, externalJobId: 1 }`
  - Unique: `true`
  - Purpose: Enforce single document per logical job.
- **Listing & Cursor Pagination Index**:
  - Key: `{ tenantId: 1, sourceId: 1, status: 1, _id: 1 }`
  - Purpose: Efficient filtered and cursor-paginated list queries.

## Detailed Steps

1. **Create `src/db/indexes.ts`**:
   - Implement `ensureIndexes(db: Db): Promise<void>`:
     ```ts
     export async function ensureIndexes(db: Db): Promise<void> {
       const events = db.collection('events');
       const jobs = db.collection('jobs');

       // Events collection indexes
       await events.createIndex(
         { tenantId: 1, sourceId: 1, eventId: 1 },
         { unique: true, name: 'uniq_tenant_source_event' }
       );

       await events.createIndex(
         { status: 1, nextAttemptAt: 1 },
         { name: 'idx_status_nextAttemptAt' }
       );

       // Jobs collection indexes
       await jobs.createIndex(
         { tenantId: 1, sourceId: 1, externalJobId: 1 },
         { unique: true, name: 'uniq_tenant_source_job' }
       );

       await jobs.createIndex(
         { tenantId: 1, sourceId: 1, status: 1, _id: 1 },
         { name: 'idx_tenant_source_status_id' }
       );
     }
     ```

2. **Idempotent Migration / Setup Hook**:
   - Integrate `ensureIndexes` into the server boot lifecycle and setup script.
   - Guard against duplicate index warnings or conflicts.

## Verification Criteria
- [ ] Running index creation on an empty database successfully creates all 4 indexes.
- [ ] Attempting to insert two documents into `events` with identical `(tenantId, sourceId, eventId)` triggers a MongoServerError code 11000.
- [ ] Attempting to insert two documents into `jobs` with identical `(tenantId, sourceId, externalJobId)` triggers a MongoServerError code 11000.
- [ ] Calling `ensureIndexes()` multiple times is idempotent.
