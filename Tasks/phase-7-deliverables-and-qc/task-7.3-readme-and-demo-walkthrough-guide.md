# Task 7.3: README and Demo Walkthrough Guide
Status: TODO

## Objective
Author high-impact, user-friendly `README.md` and `DEMO.md` guides providing clear setup commands, architectural orientation, API contracts, and a step-by-step operational walkthrough.

## Background & Requirements
Per PRD §8 & §9:
- Engineering documentation must provide a structured technical walkthrough covering:
  - Running the end-to-end demo scenario.
  - Explaining concurrency, version monotonicity, and crash-recovery failure paths.
  - Defending mathematical scaling capacity calculations.
  - Reviewing automated quality control reports and regression testing.
- `README.md` must contain:
  1. Quick Start (Prerequisites, Docker Compose, install, setup, start).
  2. One-command scripts overview (`npm run setup`, `npm run demo`, `npm run load-test`).
  3. API Specification with curl examples:
     - `POST /events`
     - `GET /events/:eventId`
     - `GET /jobs`
     - `GET /health`
  4. Environment configuration table.
  5. Test suite instructions (`npm run test:unit`, `npm run test:integration`).
- `DEMO.md` must provide:
  - Detailed explanation of what the 20-request scenario does step-by-step.
  - Expected terminal outputs and database state verification.
  - Operational runbook for deep-dive architectural review.

## Detailed Steps

1. **Write `README.md`**:
   - Clean, beautiful Markdown with clear badges, diagrams, and quickstart commands.
2. **Write `DEMO.md`**:
   - Guided walkthrough describing Phase 1, settling, Phase 2, draining, and final state.

## Verification Criteria
- [ ] Anyone can clone the repo and run `npm run setup` and `npm run demo` in under 3 minutes.
- [ ] All curl examples work against the running API.
- [ ] Comprehensive documentation enabling seamless technical reviews and production onboarding.
