import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from 'mongodb';
import { checkMongoHealth } from '../../db/health.js';

export function registerHealthRoutes(app: FastifyInstance, db: Db): void {
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const mongoHealth = await checkMongoHealth(db);
    const isHealthy = mongoHealth.status === 'ok';

    const statusCode = isHealthy ? 200 : 503;

    return reply.status(statusCode).send({
      status: isHealthy ? 'ok' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: mongoHealth,
      },
    });
  });
}
