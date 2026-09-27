import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import type { Db } from 'mongodb';
import { EventsRepository } from '../db/events-repository.js';
import { JobsRepository } from '../db/jobs-repository.js';
import { registerEventRoutes } from './routes/events.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAdminRoutes } from './routes/admin.js';
import { renderDashboardHtml } from './ui.js';

export interface AppOptions {
  db: Db;
  logger?: boolean;
}

export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  const eventsRepo = new EventsRepository(options.db);
  const jobsRepo = new JobsRepository(options.db);

  // Global Error Handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      request.log.error(error);
    }

    reply.status(statusCode).send({
      error: {
        code: error.code || (statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR'),
        message: error.message,
      },
    });
  });

  // Root Developer Portal & API Console UI
  const serveUI = async (_request: any, reply: any) => {
    reply.type('text/html; charset=utf-8').send(renderDashboardHtml());
  };
  app.get('/', serveUI);
  app.get('/ui', serveUI);

  // Register modular routes
  registerEventRoutes(app, eventsRepo);
  registerJobRoutes(app, jobsRepo);
  registerHealthRoutes(app, options.db);
  registerAdminRoutes(app, options.db);

  return app;
}
