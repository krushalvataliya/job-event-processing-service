# Task 4.1: HTTP Server Setup and Middleware
Status: DONE

## Objective
Configure and bootstrap the Fastify HTTP server with structured logging, standardized error handling, request ID tracing, and route registration.

## Background & Requirements
- Modern Fastify application factory (`buildApp()`) to facilitate both running the server in production/demo and injecting requests in tests via `app.inject()`.
- Standardized error response format:
  ```json
  {
    "error": {
      "code": "BAD_REQUEST",
      "message": "Validation failed",
      "details": [...]
    }
  }
  ```
- Graceful shutdown hook closing HTTP server and database connections cleanly.

## Detailed Steps

1. **Create `src/api/app.ts`**:
   - Factory function `buildApp(deps?: { db?: Db }): FastifyInstance`.
   - Setup Fastify with Pino logger enabled.
   - Configure global error handler:
     - Formats validation errors as `400 Bad Request`.
     - Handles custom application errors (`ConflictError` $\rightarrow$ 409, `NotFoundError` $\rightarrow$ 404).
     - Handles unexpected internal errors as `500 Internal Server Error`.
   - Register routes:
     - `/events` (`POST`, `GET /:eventId`)
     - `/jobs` (`GET`)
     - `/health` (`GET`)

2. **Create `src/api/server.ts`**:
   - Main entry point for standalone API server:
     - Calls `connectMongo()` and `ensureIndexes()`.
     - Starts Fastify listening on `config.PORT` and `config.HOST`.
     - Handles `SIGINT` / `SIGTERM`.

## Verification Criteria
- [ ] Server boots on configured port.
- [ ] Global error handler formats unexpected errors into clean JSON responses without leaking internal stack traces.
- [ ] `app.inject()` works for testing without binding to network ports.
