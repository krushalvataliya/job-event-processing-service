import { type Collection, type Db, ObjectId } from 'mongodb';
import type {
  JobProjectionDoc,
  NormalizedJobPayload,
} from '../domain/types.js';

export interface ListJobsOptions {
  tenantId: string;
  sourceId?: string;
  status?: 'active' | 'archived' | 'all';
  limit?: number;
  cursor?: string;
}

export interface ListJobsResult {
  items: JobProjectionDoc[];
  nextCursor: string | null;
}

export class JobsRepository {
  private collection: Collection<JobProjectionDoc>;

  constructor(db: Db) {
    this.collection = db.collection<JobProjectionDoc>('jobs');
  }

  /**
   * Applies an upsert event to the job projection monotonically.
   * Only applies if incomingVersion > currentVersion AND
   * (if archived, incomingVersion > archivedAtVersion).
   */
  async applyUpsert(
    tenantId: string,
    sourceId: string,
    externalJobId: string,
    incomingVersion: number,
    payload: NormalizedJobPayload,
    now: Date = new Date()
  ): Promise<{ applied: boolean }> {
    try {
      const res = await this.collection.updateOne(
        {
          tenantId,
          sourceId,
          externalJobId,
          currentVersion: { $lt: incomingVersion },
          $or: [
            { status: { $ne: 'archived' } },
            { archivedAtVersion: { $lt: incomingVersion } },
            { archivedAtVersion: null },
          ],
        },
        {
          $set: {
            currentVersion: incomingVersion,
            status: 'active',
            payload,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            archivedAtVersion: null,
          },
        },
        { upsert: true }
      );

      return { applied: res.upsertedCount > 0 || res.modifiedCount > 0 };
    } catch (err: any) {
      // If a race on upsert creates duplicate key error on (tenantId, sourceId, externalJobId),
      // we retry the update without upsert to resolve the race condition.
      if (err.code === 11000) {
        const retryRes = await this.collection.updateOne(
          {
            tenantId,
            sourceId,
            externalJobId,
            currentVersion: { $lt: incomingVersion },
            $or: [
              { status: { $ne: 'archived' } },
              { archivedAtVersion: { $lt: incomingVersion } },
              { archivedAtVersion: null },
            ],
          },
          {
            $set: {
              currentVersion: incomingVersion,
              status: 'active',
              payload,
              updatedAt: now,
            },
          }
        );
        return { applied: retryRes.modifiedCount > 0 };
      }
      throw err;
    }
  }

  /**
   * Applies an archive event as a versioned tombstone.
   * Preserves archivedAtVersion and clears payload.
   */
  async applyArchive(
    tenantId: string,
    sourceId: string,
    externalJobId: string,
    incomingVersion: number,
    now: Date = new Date()
  ): Promise<{ applied: boolean }> {
    try {
      const res = await this.collection.updateOne(
        {
          tenantId,
          sourceId,
          externalJobId,
          currentVersion: { $lt: incomingVersion },
        },
        {
          $set: {
            currentVersion: incomingVersion,
            status: 'archived',
            payload: null,
            archivedAtVersion: incomingVersion,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      );

      return { applied: res.upsertedCount > 0 || res.modifiedCount > 0 };
    } catch (err: any) {
      if (err.code === 11000) {
        const retryRes = await this.collection.updateOne(
          {
            tenantId,
            sourceId,
            externalJobId,
            currentVersion: { $lt: incomingVersion },
          },
          {
            $set: {
              currentVersion: incomingVersion,
              status: 'archived',
              payload: null,
              archivedAtVersion: incomingVersion,
              updatedAt: now,
            },
          }
        );
        return { applied: retryRes.modifiedCount > 0 };
      }
      throw err;
    }
  }

  async getJob(
    tenantId: string,
    sourceId: string,
    externalJobId: string
  ): Promise<JobProjectionDoc | null> {
    return this.collection.findOne({ tenantId, sourceId, externalJobId });
  }

  /**
   * Deterministic cursor-based pagination query.
   * Orders strictly by _id ascending.
   */
  async listJobs(options: ListJobsOptions): Promise<ListJobsResult> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const filter: any = { tenantId: options.tenantId };

    if (options.sourceId) {
      filter.sourceId = options.sourceId;
    }

    if (options.status && options.status !== 'all') {
      filter.status = options.status;
    } else if (!options.status) {
      filter.status = 'active'; // default is active
    }

    if (options.cursor) {
      try {
        const rawId = Buffer.from(options.cursor, 'base64').toString('utf8');
        filter._id = { $gt: new ObjectId(rawId) };
      } catch {
        // Invalid cursor ignored or throws
      }
    }

    const items = await this.collection
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = items.length > limit;
    const paginatedItems = hasMore ? items.slice(0, limit) : items;

    let nextCursor: string | null = null;
    if (hasMore && paginatedItems.length > 0) {
      const lastItem = paginatedItems[paginatedItems.length - 1];
      nextCursor = Buffer.from(lastItem._id.toHexString()).toString('base64');
    }

    return {
      items: paginatedItems,
      nextCursor,
    };
  }
}
