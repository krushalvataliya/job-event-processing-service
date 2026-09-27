import type { Db } from 'mongodb';

export async function ensureIndexes(db: Db): Promise<void> {
  const events = db.collection('events');
  const jobs = db.collection('jobs');

  // 1. Unique index on events: (tenantId, sourceId, eventId)
  await events.createIndex(
    { tenantId: 1, sourceId: 1, eventId: 1 },
    { unique: true, name: 'uniq_tenant_source_event' }
  );

  // 2. Worker query index on events: (status, nextAttemptAt)
  await events.createIndex(
    { status: 1, nextAttemptAt: 1 },
    { name: 'idx_status_nextAttemptAt' }
  );

  // 3. Unique index on jobs: (tenantId, sourceId, externalJobId)
  await jobs.createIndex(
    { tenantId: 1, sourceId: 1, externalJobId: 1 },
    { unique: true, name: 'uniq_tenant_source_job' }
  );

  // 4. Listing and cursor pagination index on jobs: (tenantId, sourceId, status, _id)
  await jobs.createIndex(
    { tenantId: 1, sourceId: 1, status: 1, _id: 1 },
    { name: 'idx_tenant_source_status_id' }
  );
}
