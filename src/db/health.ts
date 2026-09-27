import type { Db } from 'mongodb';
import { getDb } from './client.js';

export interface HealthCheckResult {
  status: 'ok' | 'down';
  latencyMs?: number;
  error?: string;
}

export async function checkMongoHealth(database?: Db): Promise<HealthCheckResult> {
  const start = performance.now();
  try {
    const targetDb = database || getDb();

    // Ping the admin database with a 2000ms timeout
    const pingPromise = targetDb.admin().ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Mongo ping timeout (2000ms)')), 2000)
    );

    await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);

    return {
      status: 'ok',
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'down',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
