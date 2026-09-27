import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { JobsRepository } from '../../db/jobs-repository.js';

export function registerJobRoutes(
  app: FastifyInstance,
  jobsRepo: JobsRepository
): void {
  // GET /jobs - Tenant Scoped Projections with Cursor Pagination
  app.get(
    '/jobs',
    async (
      request: FastifyRequest<{
        Querystring: {
          tenantId?: string;
          sourceId?: string;
          status?: 'active' | 'archived' | 'all';
          limit?: string;
          cursor?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, sourceId, status, limit, cursor } = request.query;

      if (!tenantId || !tenantId.trim()) {
        return reply.status(400).send({
          error: {
            code: 'MISSING_TENANT_ID',
            message: 'tenantId query parameter is required',
          },
        });
      }

      const parsedLimit = limit ? Number.parseInt(limit, 10) : 20;
      const validLimit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;

      const result = await jobsRepo.listJobs({
        tenantId: tenantId.trim(),
        sourceId: sourceId ? sourceId.trim() : undefined,
        status: status || 'active',
        limit: validLimit,
        cursor: cursor ? cursor.trim() : undefined,
      });

      return reply.status(200).send({
        items: result.items.map((job) => ({
          tenantId: job.tenantId,
          sourceId: job.sourceId,
          externalJobId: job.externalJobId,
          currentVersion: job.currentVersion,
          status: job.status,
          payload: job.payload,
          archivedAtVersion: job.archivedAtVersion,
          updatedAt: job.updatedAt,
          createdAt: job.createdAt,
        })),
        pageInfo: {
          limit: validLimit,
          nextCursor: result.nextCursor,
        },
      });
    }
  );
}
