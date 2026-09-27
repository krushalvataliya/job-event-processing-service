import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Db } from 'mongodb';

interface ClearDbQuery {
  tenantId?: string;
}

export function registerAdminRoutes(app: FastifyInstance, db: Db): void {
  app.post('/admin/clear-db', async (request: FastifyRequest<{ Querystring: ClearDbQuery }>, reply: FastifyReply) => {
    const { tenantId } = request.query;
    const filter = tenantId ? { tenantId } : {};

    const [eventsResult, jobsResult] = await Promise.all([
      db.collection('events').deleteMany(filter),
      db.collection('jobs').deleteMany(filter),
    ]);

    return reply.status(200).send({
      success: true,
      message: tenantId
        ? `Cleared records for tenant: ${tenantId}`
        : 'All events and job projections cleared from database',
      deletedEvents: eventsResult.deletedCount,
      deletedJobs: jobsResult.deletedCount,
      tenantId: tenantId || 'all',
      timestamp: new Date().toISOString(),
    });
  });
}
