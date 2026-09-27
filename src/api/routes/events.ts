import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { EventsRepository } from '../../db/events-repository.js';
import { validateEventInput } from '../../domain/validation.js';
import { normalizePayload } from '../../domain/normalization.js';
import { computeEventContentHash } from '../../domain/hashing.js';

export function registerEventRoutes(
  app: FastifyInstance,
  eventsRepo: EventsRepository
): void {
  // POST /events - Durable Ingestion
  app.post(
    '/events',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 1. Validate input structure and identifiers
      const validation = validateEventInput(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request payload or identifiers',
            details: validation.errors,
          },
        });
      }

      const input = validation.data;

      // 2. Normalize payload
      let normalizedPayload = null;
      if (input.operation === 'upsert' && input.payload) {
        try {
          normalizedPayload = normalizePayload(input.payload);
        } catch (err: any) {
          return reply.status(400).send({
            error: {
              code: 'NORMALIZATION_ERROR',
              message: err.message,
            },
          });
        }
      }

      // 3. Compute canonical hash
      const payloadHash = computeEventContentHash({
        externalJobId: input.externalJobId,
        version: input.version,
        operation: input.operation,
        payload: normalizedPayload,
      });

      // 4. Atomic insert-first to events collection
      const result = await eventsRepo.insertEvent({
        tenantId: input.tenantId,
        sourceId: input.sourceId,
        eventId: input.eventId,
        externalJobId: input.externalJobId,
        version: input.version,
        operation: input.operation,
        payload: normalizedPayload,
        payloadHash,
        rawPayload: request.body,
      });

      if (result.status === 'inserted') {
        return reply.status(202).send({
          status: 'accepted',
          eventId: result.event.eventId,
          message: 'Event durably queued for processing',
        });
      }

      if (result.status === 'duplicate_replay') {
        return reply.status(200).send({
          status: 'duplicate_replay',
          eventId: result.event.eventId,
          message: 'Event already accepted with identical content',
          event: {
            eventId: result.event.eventId,
            status: result.event.status,
            attempts: result.event.attempts,
            createdAt: result.event.createdAt,
          },
        });
      }

      // result.status === 'conflict'
      return reply.status(409).send({
        error: {
          code: 'EVENT_ID_CONFLICT',
          message: 'Event ID already exists with differing payload or version',
          existingEvent: {
            eventId: result.event.eventId,
            status: result.event.status,
            version: result.event.version,
            operation: result.event.operation,
          },
        },
      });
    }
  );

  // GET /events/:eventId - Query Event Status
  app.get(
    '/events/:eventId',
    async (
      request: FastifyRequest<{
        Params: { eventId: string };
        Querystring: { tenantId?: string; sourceId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { eventId } = request.params;
      const { tenantId, sourceId } = request.query;

      if (!tenantId || !sourceId || !tenantId.trim() || !sourceId.trim()) {
        return reply.status(400).send({
          error: {
            code: 'MISSING_QUERY_PARAMS',
            message: 'Both tenantId and sourceId query parameters are required',
          },
        });
      }

      const event = await eventsRepo.getEvent(tenantId.trim(), sourceId.trim(), eventId);
      if (!event) {
        return reply.status(404).send({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: `Event '${eventId}' not found for tenant '${tenantId}' and source '${sourceId}'`,
          },
        });
      }

      return reply.status(200).send({
        tenantId: event.tenantId,
        sourceId: event.sourceId,
        eventId: event.eventId,
        externalJobId: event.externalJobId,
        version: event.version,
        operation: event.operation,
        status: event.status,
        attempts: event.attempts,
        attemptHistory: event.attemptHistory,
        lastError: event.lastError,
        createdAt: event.createdAt,
        completedAt: event.completedAt,
      });
    }
  );
}
