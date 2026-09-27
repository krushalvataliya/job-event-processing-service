# Task 2.1: MongoDB Connection and Health Probe
Status: DONE

## Objective
Implement a robust MongoDB client singleton with lifecycle management, connection pooling, graceful shutdown handlers, and health probe utility (`ping`).

## Background & Requirements
- Connects using official `mongodb` npm driver.
- Configurable connection parameters via `config.MONGO_URI` with sane pool sizes (e.g. `maxPoolSize: 50`).
- Provides a healthcheck helper `checkMongoHealth()` that executes `db.admin().ping()` with a strict 2-second timeout to distinguish healthy, degraded, or down states.
- Clean shutdown handler on `SIGTERM` and `SIGINT` ensuring in-flight operations finish before socket closure.

## Detailed Steps

1. **Create `src/db/client.ts`**:
   - Maintain client instance:
     ```ts
     import { MongoClient, Db } from 'mongodb';
     import { config } from '../config/index.js';

     let client: MongoClient | null = null;
     let db: Db | null = null;

     export async function connectMongo(): Promise<{ client: MongoClient; db: Db }> {
       if (client && db) return { client, db };

       client = new MongoClient(config.MONGO_URI, {
         maxPoolSize: 50,
         minPoolSize: 5,
         serverSelectionTimeoutMS: 5000,
       });

       await client.connect();
       db = client.db();
       return { client, db };
     }

     export function getDb(): Db {
       if (!db) {
         throw new Error('Database not initialized. Call connectMongo() first.');
       }
       return db;
     }

     export async function closeMongo(): Promise<void> {
       if (client) {
         await client.close();
         client = null;
         db = null;
       }
     }
     ```

2. **Implement Health Probe in `src/db/health.ts`**:
   - `checkMongoHealth(): Promise<{ ok: boolean; latencyMs?: number; error?: string }>`:
     - Run `db.admin().ping()` wrapped with `Promise.race` against a 2000ms timeout.
     - Measure roundtrip latency.
     - Return status object.

## Verification Criteria
- [ ] Connects successfully to local MongoDB instance.
- [ ] `checkMongoHealth()` returns `{ ok: true, latencyMs: <number> }` when Mongo is running.
- [ ] Returns `{ ok: false, error: ... }` when Mongo is unreachable or times out.
- [ ] Calling `closeMongo()` gracefully cleans up connections without hanging.
