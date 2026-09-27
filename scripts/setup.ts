import { connectMongo, closeMongo } from '../src/db/client.js';
import { ensureIndexes } from '../src/db/indexes.js';
import { checkMongoHealth } from '../src/db/health.js';

async function setup() {
  console.log('🚀 Running Job Event Processing Service Database Setup...');
  try {
    const { db } = await connectMongo();
    console.log('✅ Connected to MongoDB');

    const health = await checkMongoHealth(db);
    console.log(`✅ Health check status: ${health.status} (${health.latencyMs}ms latency)`);

    console.log('🔨 Ensuring required indexes...');
    await ensureIndexes(db);
    console.log('✅ Unique and query indexes verified on `events` and `jobs` collections');

    console.log('🎉 Setup completed successfully!');
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  } finally {
    await closeMongo();
  }
}

setup();
