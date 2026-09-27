import { buildApp } from './app.js';
import { connectMongo, closeMongo } from '../db/client.js';
import { ensureIndexes } from '../db/indexes.js';
import { config } from '../config/index.js';
import { startWorkerPool } from '../worker/index.js';

async function startServer() {
  console.log('🚀 Starting Job Event Processing Service HTTP Server...');

  const { db } = await connectMongo();
  await ensureIndexes(db);

  const app = buildApp({ db, logger: config.LOG_LEVEL === 'debug' });

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`✅ Server listening on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    await closeMongo();
    process.exit(1);
  }

  // Start background worker pool if enabled (default: true for single-container cloud deployments like Render)
  if (process.env.RUN_WORKER !== 'false') {
    startWorkerPool().catch((err) => {
      console.error('Background worker pool error:', err);
    });
  }

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down server...`);
    await app.close();
    await closeMongo();
    console.log('✅ Server stopped cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Unconditionally auto-start server on execution
startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});

export { startServer };
