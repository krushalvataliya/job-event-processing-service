import { connectMongo, closeMongo } from '../db/client.js';
import { EventsRepository } from '../db/events-repository.js';
import { JobsRepository } from '../db/jobs-repository.js';
import { VerificationClient } from '../provider/verification-client.js';
import { WorkerEngine } from './worker-engine.js';
import { config } from '../config/index.js';

async function startWorkerPool() {
  console.log(`🚀 Booting Job Event Processing Worker Pool (Count: ${config.WORKER_COUNT})...`);

  const { db } = await connectMongo();
  const eventsRepo = new EventsRepository(db);
  const jobsRepo = new JobsRepository(db);
  const provider = new VerificationClient();

  const workers: WorkerEngine[] = [];

  for (let i = 1; i <= config.WORKER_COUNT; i++) {
    const workerId = `worker-${process.pid}-${i}`;
    const engine = new WorkerEngine(workerId, eventsRepo, jobsRepo, provider, {
      pollIntervalMs: config.WORKER_POLL_INTERVAL_MS,
      leaseMs: config.WORKER_LEASE_MS,
      baseDelayMs: config.RETRY_BASE_DELAY_MS,
      maxAttempts: config.RETRY_MAX_ATTEMPTS,
    });

    workers.push(engine);
    engine.start();
    console.log(`[Pool] Started competing worker: ${workerId}`);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Gracefully stopping worker pool...`);
    await Promise.all(workers.map((w) => w.stop()));
    await closeMongo();
    console.log('✅ Worker pool stopped cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Auto-run if executed directly
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].replace(/\\/g, '/').endsWith('worker/index.ts') ||
    process.argv[1].replace(/\\/g, '/').endsWith('worker/index.js'));

if (isDirectRun) {
  startWorkerPool().catch((err) => {
    console.error('Fatal worker pool error:', err);
    process.exit(1);
  });
}

export { startWorkerPool };
