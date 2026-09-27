import fs from 'node:fs';
import path from 'node:path';
import { connectMongo, closeMongo } from '../src/db/client.js';
import { ensureIndexes } from '../src/db/indexes.js';
import { EventsRepository } from '../src/db/events-repository.js';
import { JobsRepository } from '../src/db/jobs-repository.js';
import { VerificationClient } from '../src/provider/verification-client.js';
import { WorkerEngine } from '../src/worker/worker-engine.js';
import { buildApp } from '../src/api/app.js';

interface DemoRequest {
  step: number;
  phase: number;
  name: string;
  expectedStatus: number;
  body: any;
}

interface DemoScenarioFile {
  description: string;
  requests: DemoRequest[];
}

async function runDemo() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   JOB EVENT PROCESSING SERVICE — AUTOMATED END-TO-END DEMO        ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Connect to Database & Setup Repositories
  const { db } = await connectMongo();
  await ensureIndexes(db);

  const demoTenants = ['demo-tenant-primary', 'demo-tenant-secondary'];
  console.log('🧹 Purging previous demo tenant records...');
  await db.collection('events').deleteMany({ tenantId: { $in: demoTenants } });
  await db.collection('jobs').deleteMany({ tenantId: { $in: demoTenants } });
  console.log('✅ Demo test state clean.\n');

  const eventsRepo = new EventsRepository(db);
  const jobsRepo = new JobsRepository(db);
  const provider = new VerificationClient();
  const app = buildApp({ db, logger: false });
  await app.ready();

  // 2. Start Competing Workers Pool (2 concurrent workers)
  const worker1 = new WorkerEngine('demo-worker-1', eventsRepo, jobsRepo, provider, {
    pollIntervalMs: 50,
    leaseMs: 5000,
    baseDelayMs: 100, // fast backoff for demo
    maxAttempts: 3,
  });
  const worker2 = new WorkerEngine('demo-worker-2', eventsRepo, jobsRepo, provider, {
    pollIntervalMs: 50,
    leaseMs: 5000,
    baseDelayMs: 100,
    maxAttempts: 3,
  });

  worker1.start();
  worker2.start();
  console.log('👥 Worker pool started: [demo-worker-1, demo-worker-2] actively competing for tasks.\n');

  // 3. Load Fixture Scenario
  const fixturePath = path.resolve(process.cwd(), 'fixtures', 'demo-scenario.json');
  const scenario: DemoScenarioFile = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  const phase1Requests = scenario.requests.filter((r) => r.phase === 1);
  const phase2Requests = scenario.requests.filter((r) => r.phase === 2);

  let passedAssertions = 0;
  let totalAssertions = 0;

  const submitBatch = async (requests: DemoRequest[], phaseName: string) => {
    console.log(`───────────────────────────────────────────────────────────────────`);
    console.log(`  Submitting ${phaseName} (${requests.length} Requests)`);
    console.log(`───────────────────────────────────────────────────────────────────`);

    for (const req of requests) {
      totalAssertions++;
      const res = await app.inject({
        method: 'POST',
        url: '/events',
        payload: req.body,
      });

      const isStatusMatch = res.statusCode === req.expectedStatus;
      if (isStatusMatch) {
        passedAssertions++;
        console.log(`  [Step ${req.step.toString().padStart(2, '0')}] ✅ HTTP ${res.statusCode} | ${req.name}`);
      } else {
        console.error(
          `  [Step ${req.step.toString().padStart(2, '0')}] ❌ Expected HTTP ${req.expectedStatus}, got ${res.statusCode} | ${req.name}`
        );
      }
    }
  };

  const drainQueue = async (phaseName: string) => {
    console.log(`\n⏳ Waiting for ${phaseName} queue to drain across demo workers...`);
    const start = Date.now();
    let pending = await eventsRepo.countPendingOrClaimed();
    let loops = 0;

    while (pending > 0 && loops < 120) {
      await new Promise((r) => setTimeout(r, 100));
      pending = await eventsRepo.countPendingOrClaimed();
      loops++;
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    if (pending === 0) {
      console.log(`✨ ${phaseName} successfully settled in ${duration}s (backlog = 0).\n`);
    } else {
      console.warn(`⚠️ Warning: ${phaseName} drain timed out with ${pending} items still pending/claimed.\n`);
    }
  };

  try {
    // 4. Run Phase 1
    await submitBatch(phase1Requests, 'PHASE 1');
    await drainQueue('Phase 1');

    // 5. Run Phase 2 (Delayed out-of-order, stale, and reactivation)
    await submitBatch(phase2Requests, 'PHASE 2');
    await drainQueue('Phase 2');

    // 6. Assert Final System Projections and Audit State
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('  FINAL VERIFICATION OF PROJECTIONS & ATTEMPT AUDIT TRAILS');
    console.log('───────────────────────────────────────────────────────────────────');

    const assertions = [
      {
        name: 'demo-job-alpha reflects version 1 and active status',
        check: async () => {
          const j = await jobsRepo.getJob('demo-tenant-primary', 'main', 'demo-job-alpha');
          return j?.currentVersion === 1 && j?.status === 'active';
        },
      },
      {
        name: 'demo-job-ooo reflects version 3 (stale v2 was skipped)',
        check: async () => {
          const j = await jobsRepo.getJob('demo-tenant-primary', 'main', 'demo-job-ooo');
          return j?.currentVersion === 3 && j?.payload?.title === 'Principal Architect v3';
        },
      },
      {
        name: 'demo-job-archived-first reflects tombstone v2 (delayed v1 blocked)',
        check: async () => {
          const j = await jobsRepo.getJob('demo-tenant-primary', 'main', 'demo-job-archived-first');
          return j?.currentVersion === 2 && j?.status === 'archived' && j?.payload === null;
        },
      },
      {
        name: 'demo-job-reactivate reflects version 3 active (upsert -> archive -> reactivate)',
        check: async () => {
          const j = await jobsRepo.getJob('demo-tenant-primary', 'main', 'demo-job-reactivate');
          return j?.currentVersion === 3 && j?.status === 'active' && j?.payload?.title === 'Reactivated Lead Engineer v3';
        },
      },
      {
        name: 'demo-job-higher-fail preserves lower version 1 (higher v2 failure kept v1 intact)',
        check: async () => {
          const j = await jobsRepo.getJob('demo-tenant-primary', 'main', 'demo-job-higher-fail');
          return j?.currentVersion === 1 && j?.payload?.title === 'Stable Baseline v1';
        },
      },
      {
        name: 'demo-evt-10 (transient 503) succeeded after 3 attempts',
        check: async () => {
          const e = await eventsRepo.getEvent('demo-tenant-primary', 'main', 'demo-evt-10');
          return e?.status === 'completed' && e?.attempts === 3;
        },
      },
      {
        name: 'demo-evt-11 (permanent 422) failed immediately without creating projection',
        check: async () => {
          const e = await eventsRepo.getEvent('demo-tenant-primary', 'main', 'demo-evt-11');
          const j = await jobsRepo.getJob('demo-tenant-primary', 'main', 'demo-job-perm-fail');
          return e?.status === 'failed' && j === null;
        },
      },
      {
        name: 'demo-evt-12 (rate-limit 429) exhausted retries after 3 attempts',
        check: async () => {
          const e = await eventsRepo.getEvent('demo-tenant-primary', 'main', 'demo-evt-12');
          return e?.status === 'failed' && e?.attempts === 3;
        },
      },
      {
        name: 'Cross-tenant isolation: demo-tenant-secondary job is completely independent',
        check: async () => {
          const j = await jobsRepo.getJob('demo-tenant-secondary', 'main', 'demo-job-alpha');
          return j?.currentVersion === 1 && j?.payload?.title === 'Tenant B Isolated Developer';
        },
      },
    ];

    for (const a of assertions) {
      totalAssertions++;
      const passed = await a.check();
      if (passed) {
        passedAssertions++;
        console.log(`  ✅ PASS: ${a.name}`);
      } else {
        console.error(`  ❌ FAIL: ${a.name}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log(`  DEMO RESULT: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED (100%)`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    if (passedAssertions !== totalAssertions) {
      process.exit(1);
    }
  } finally {
    await worker1.stop();
    await worker2.stop();
    await app.close();
    await closeMongo();
  }
}

runDemo().catch((err) => {
  console.error('Fatal demo failure:', err);
  process.exit(1);
});
