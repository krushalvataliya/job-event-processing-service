import type { ObjectId } from 'mongodb';

export type EventOperation = 'upsert' | 'archive';
export type EventStatus = 'pending' | 'claimed' | 'completed' | 'failed';
export type JobStatus = 'active' | 'archived';
export type AttemptOutcome = 'success' | 'retryable_error' | 'permanent_error';

export interface RawJobPayload {
  title: string;
  company: string;
  location: string;
  experienceMin: number;
  experienceMax: number;
  applyUrl: string;
  skills: string[];
}

export interface NormalizedJobPayload {
  title: string;
  company: string;
  location: string;
  experienceMin: number;
  experienceMax: number;
  applyUrl: string;
  skills: string[];
}

export interface AttemptRecord {
  attemptNumber: number;
  startedAt: Date;
  outcome: AttemptOutcome;
  httpStatus?: number;
  error?: string;
  nextRetryAt?: Date;
}

export interface JobEventDoc {
  _id?: ObjectId;
  tenantId: string;
  sourceId: string;
  eventId: string;
  externalJobId: string;
  version: number;
  operation: EventOperation;
  payload: NormalizedJobPayload | null;
  payloadHash: string;
  rawPayload: unknown;

  status: EventStatus;
  attempts: number;
  attemptHistory: AttemptRecord[];
  lastError: string | null;

  claimedBy: string | null;
  claimedAt: Date | null;
  leaseExpiresAt: Date | null;
  nextAttemptAt: Date | null;

  createdAt: Date;
  completedAt: Date | null;
}

export interface JobProjectionDoc {
  _id?: ObjectId;
  tenantId: string;
  sourceId: string;
  externalJobId: string;

  currentVersion: number;
  status: JobStatus;
  payload: NormalizedJobPayload | null;
  archivedAtVersion: number | null;

  updatedAt: Date;
  createdAt: Date;
}
