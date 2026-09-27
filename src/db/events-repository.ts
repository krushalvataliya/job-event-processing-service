import type { Collection, Db, ObjectId } from 'mongodb';
import type {
  JobEventDoc,
  NormalizedJobPayload,
  EventOperation,
  AttemptRecord,
} from '../domain/types.js';

export interface InsertEventInput {
  tenantId: string;
  sourceId: string;
  eventId: string;
  externalJobId: string;
  version: number;
  operation: EventOperation;
  payload: NormalizedJobPayload | null;
  payloadHash: string;
  rawPayload: unknown;
}

export type InsertEventResult =
  | { status: 'inserted'; event: JobEventDoc }
  | { status: 'duplicate_replay'; event: JobEventDoc }
  | { status: 'conflict'; event: JobEventDoc };

export class EventsRepository {
  private collection: Collection<JobEventDoc>;

  constructor(db: Db) {
    this.collection = db.collection<JobEventDoc>('events');
  }

  /**
   * Atomic insert-first pattern for race-safe idempotency.
   */
  async insertEvent(input: InsertEventInput): Promise<InsertEventResult> {
    const now = new Date();
    const eventDoc: JobEventDoc = {
      tenantId: input.tenantId,
      sourceId: input.sourceId,
      eventId: input.eventId,
      externalJobId: input.externalJobId,
      version: input.version,
      operation: input.operation,
      payload: input.payload,
      payloadHash: input.payloadHash,
      rawPayload: input.rawPayload,

      status: 'pending',
      attempts: 0,
      attemptHistory: [],
      lastError: null,

      claimedBy: null,
      claimedAt: null,
      leaseExpiresAt: null,
      nextAttemptAt: now,

      createdAt: now,
      completedAt: null,
    };

    try {
      const res = await this.collection.insertOne(eventDoc);
      eventDoc._id = res.insertedId;
      return { status: 'inserted', event: eventDoc };
    } catch (err: any) {
      // Catch duplicate key error (code 11000)
      if (err.code === 11000) {
        const existing = await this.collection.findOne({
          tenantId: input.tenantId,
          sourceId: input.sourceId,
          eventId: input.eventId,
        });

        if (!existing) {
          // In rare case of simultaneous cleanup
          throw err;
        }

        if (existing.payloadHash === input.payloadHash) {
          return { status: 'duplicate_replay', event: existing };
        } else {
          return { status: 'conflict', event: existing };
        }
      }
      throw err;
    }
  }

  /**
   * Atomically claims the next pending or expired-lease event.
   */
  async claimNextEvent(
    workerId: string,
    leaseDurationMs: number,
    now: Date = new Date(),
    tenantId?: string
  ): Promise<JobEventDoc | null> {
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

    const query: any = {
      status: { $in: ['pending', 'claimed'] },
      nextAttemptAt: { $lte: now },
      $or: [
        { status: 'pending' },
        { leaseExpiresAt: { $lt: now } }, // Recover crashed/abandoned workers
      ],
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    const doc = await this.collection.findOneAndUpdate(
      query,
      {
        $set: {
          status: 'claimed',
          claimedBy: workerId,
          claimedAt: now,
          leaseExpiresAt,
        },
      },
      {
        sort: { nextAttemptAt: 1 },
        returnDocument: 'after',
      }
    );

    return doc;
  }

  async getEvent(
    tenantId: string,
    sourceId: string,
    eventId: string
  ): Promise<JobEventDoc | null> {
    return this.collection.findOne({ tenantId, sourceId, eventId });
  }

  async recordSuccess(
    id: ObjectId,
    attempt: AttemptRecord,
    now: Date = new Date()
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          status: 'completed',
          completedAt: now,
          claimedBy: null,
          claimedAt: null,
          leaseExpiresAt: null,
        },
        $inc: { attempts: 1 },
        $push: { attemptHistory: attempt },
      }
    );
  }

  async recordRetry(
    id: ObjectId,
    attempt: AttemptRecord,
    nextAttemptAt: Date
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          status: 'pending',
          nextAttemptAt,
          claimedBy: null,
          claimedAt: null,
          leaseExpiresAt: null,
        },
        $inc: { attempts: 1 },
        $push: { attemptHistory: attempt },
      }
    );
  }

  async recordFailure(
    id: ObjectId,
    attempt: AttemptRecord,
    errorMessage: string
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          status: 'failed',
          lastError: errorMessage,
          claimedBy: null,
          claimedAt: null,
          leaseExpiresAt: null,
        },
        $inc: { attempts: 1 },
        $push: { attemptHistory: attempt },
      }
    );
  }

  async countPendingOrClaimed(tenantId?: string): Promise<number> {
    const query: any = { status: { $in: ['pending', 'claimed'] } };
    if (tenantId) {
      query.tenantId = tenantId;
    }
    return this.collection.countDocuments(query);
  }
}
