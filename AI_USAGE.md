# AI Usage & Engineering Governance Log (AI_USAGE.md)

## 1. Overview & Standards
This document records AI-assisted development across the codebase, detailing human architectural review, modifications, and independent verification methods.

---

## 2. Interaction Log

| Task / Artifact | AI Tool & Model | Human Intent / Prompt Summary | Code Accepted vs Modified | Independent Verification Method |
|---|---|---|---|---|
| **Phase 0: Scaffold & Setup** | Gemini 2.5 Flash | Scaffold Node 22, TypeScript strict mode, Zod config, and Docker Compose. | Accepted typed config structure; adjusted environment variable fallback for Mongo URI; added strict validation rules. | Ran `npm run typecheck`, `npm test`, verified Docker configuration syntax. |
| **Phase 1: Domain Logic** | Gemini 2.5 Flash | Implement canonical JSON hashing and normalization functions. | Enforced strict whitespace rejection without silent trimming on identifiers; verified key sorting and array preservation. | Hermetic unit tests in `test/unit/` covering permutations and edge cases. |

---

## 3. Human Architectural Critique & Verification
- **Identifier Whitespace Verification**: Verified that `tenantId`, `sourceId`, `eventId`, and `externalJobId` reject leading/trailing spaces with `400 Bad Request` rather than silently calling `.trim()`.
- **Insert-First Idempotency**: Verified that `POST /events` directly calls `insertOne` and catches duplicate key error 11000 rather than checking with `findOne` first, preventing concurrency races.
