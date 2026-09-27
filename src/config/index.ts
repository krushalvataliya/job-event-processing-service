import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  MONGO_URI: z.string().min(1, 'MONGO_URI or MONGODB_URI is required'),
  WORKER_COUNT: z.coerce.number().int().min(1).default(2),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(200),
  WORKER_LEASE_MS: z.coerce.number().int().positive().default(15000),
  RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(500),
  RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const rawConfig = {
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/jobevents',
  WORKER_COUNT: process.env.WORKER_COUNT,
  WORKER_POLL_INTERVAL_MS: process.env.WORKER_POLL_INTERVAL_MS,
  WORKER_LEASE_MS: process.env.WORKER_LEASE_MS,
  RETRY_BASE_DELAY_MS: process.env.RETRY_BASE_DELAY_MS,
  RETRY_MAX_ATTEMPTS: process.env.RETRY_MAX_ATTEMPTS,
  LOG_LEVEL: process.env.LOG_LEVEL,
};

const parsed = envSchema.safeParse(rawConfig);

if (!parsed.success) {
  console.error('❌ Configuration validation failed:', parsed.error.format());
  throw new Error('Invalid configuration');
}

export const config = Object.freeze(parsed.data);
export type Config = z.infer<typeof envSchema>;
