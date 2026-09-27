# Task 0.1: Project Scaffold and Dependencies
Status: DONE

## Objective
Initialize the project repository with Node.js 22+, TypeScript strict mode, package manager configuration, test runner (Vitest), linter, code formatter, and core dependencies.

## Background & Requirements
- **Runtime**: Node.js ≥ 22.x LTS.
- **Language**: TypeScript with `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, and ES2022/ESNext module target.
- **HTTP Framework**: Fastify (or Express, Fastify recommended for high throughput, native JSON schema support, and TypeScript ergonomics).
- **Database Driver**: `mongodb` (native official Node.js driver v6+).
- **Validation**: `zod` for domain and request schema validation.
- **Testing**: `vitest` with `@types/node` and TypeScript support.
- **Scripts Runner**: `tsx` for direct TypeScript script execution (`demo.ts`, `load-test.ts`, `setup.ts`).
- **No Heavy Queue Dependencies**: Avoid Redis, Kafka, or RabbitMQ in the runnable core.

## Detailed Steps

1. **Initialize `package.json`**:
   - Set `"type": "module"`.
   - Configure npm scripts:
     - `build`: `tsc -p tsconfig.json`
     - `start`: `node dist/src/api/server.js`
     - `dev`: `tsx watch src/api/server.ts`
     - `worker`: `tsx src/worker/index.ts`
     - `test`: `vitest run`
     - `test:unit`: `vitest run test/unit`
     - `test:integration`: `vitest run test/integration`
     - `setup`: `tsx scripts/setup.ts`
     - `demo`: `tsx scripts/demo.ts`
     - `load-test`: `tsx scripts/load-test.ts`
     - `lint`: `eslint .`
     - `format`: `prettier --write .`
     - `typecheck`: `tsc --noEmit`

2. **Configure Dependencies**:
   - Production dependencies:
     - `fastify`
     - `mongodb`
     - `zod`
     - `dotenv`
   - Development dependencies:
     - `typescript`
     - `tsx`
     - `vitest`
     - `@types/node`
     - `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
     - `prettier`

3. **Configure `tsconfig.json`**:
   - Set `"target": "ES2022"`
   - Set `"module": "NodeNext"`
   - Set `"moduleResolution": "NodeNext"`
   - Set `"strict": true`
   - Set `"esModuleInterop": true`
   - Set `"skipLibCheck": true`
   - Set `"forceConsistentCasingInFileNames": true`
   - Set `"outDir": "./dist"`
   - Set `"rootDir": "./"`
   - Include `src`, `scripts`, `test`, `fixtures`.

4. **Directory Skeleton Creation**:
   - Create directories:
     - `src/api`
     - `src/domain`
     - `src/worker`
     - `src/db`
     - `src/provider`
     - `src/config`
     - `fixtures`
     - `scripts`
     - `test/unit`
     - `test/integration`

## Verification Criteria
- [ ] `npm install` runs cleanly with no dependency errors.
- [ ] `npm run typecheck` succeeds without compilation errors.
- [ ] `npm test` runs vitest and reports 0 failed tests.
- [ ] All directories in the repository layout exist.
