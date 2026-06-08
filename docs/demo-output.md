# Illustrative Terminal Command Output

This document contains illustrative terminal output logs for the project's verification scripts. These logs show the expected behavior when running validation, testing, typecheck, and dashboard commands locally.

## 1. Example Schema Validation
Running `npm run validate:examples` validates all JSON templates in `examples/` against the JSON schemas in `schemas/`.

```text
> @sebastianfoerste/ai-saas-legal-ops-starter-kit@1.0.0 validate:examples
> vitest run tests/schema-validation.test.ts

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

 RUN  v1.6.1 /Users/sebastian/Developer/ai-saas-legal-ops-starter-kit

 ✓ tests/schema-validation.test.ts  (6 tests) 27ms
   ✓ should validate synthetic example for SaaS Contract Intake against schema
   ✓ should validate synthetic example for DPA Triage against schema
   ✓ should validate synthetic example for AI Vendor Review against schema
   ✓ should validate synthetic example for Open-Source Review against schema
   ✓ should validate synthetic example for Customer Commitment against schema
   ✓ should validate synthetic example for Product Launch Intake against schema

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  2026-06-01 21:46:03
   Duration  200ms (transform 22ms, setup 0ms, collect 39ms, tests 27ms)
```

## 2. Test Suite Execution
Running `npm run test` executes all unit tests verifying validation, deterministic risk scoring, policy health, storage safety, action plans, contract playbooks, evidence packs, regulatory matrices, decision packets, risk registers, package metadata, and the demo CLI.

```text
> @sebastianfoerste/ai-saas-legal-ops-starter-kit@1.0.0 test
> vitest run

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

 RUN  v1.6.1 /Users/sebastian/Developer/ai-saas-legal-ops-starter-kit

 ✓ tests/package-smoke.test.ts  (2 tests)
 ✓ tests/action-plan.test.ts  (4 tests)
 ✓ tests/storage-safety.test.ts  (5 tests)
 ✓ tests/policy-health.test.ts  (4 tests)
 ✓ tests/evidence-pack.test.ts  (5 tests)
 ✓ tests/contract-playbook.test.ts  (5 tests)
 ✓ tests/risk-scoring.test.ts  (18 tests)
 ✓ tests/persistence.test.ts  (6 tests)
 ✓ tests/regulatory-matrix.test.ts  (6 tests)
 ✓ tests/risk-register.test.ts  (2 tests)
 ✓ tests/schema-validation.test.ts  (6 tests)
 ✓ tests/decision-packet.test.ts  (2 tests)
 ✓ tests/cli.test.ts  (15 tests)

 Test Files  13 passed (13)
      Tests  80 passed (80)
```

## 3. TypeScript Typecheck
Running `npm run typecheck` runs strict TypeScript checks over the codebase to ensure zero compilation or declaration errors.

```text
> @sebastianfoerste/ai-saas-legal-ops-starter-kit@1.0.0 typecheck
> tsc --noEmit

(Command completed with exit code 0 and no output, indicating all types are valid.)
```

## 4. End-to-End Demo CLI
Running `npm run demo` builds the package and prints a Markdown report from bundled public-safe examples.

```text
> @sebastianfoerste/ai-saas-legal-ops-starter-kit@1.0.0 demo
> npm run build && node dist/src/cli.js

# AI SaaS Legal Ops Demo Report

- Examples Valid: 6/6
- Portfolio Summary: 6 matters reviewed. 5 matters are high-risk or escalated, and 6 matters require human review.

## Matter Overview
## Approval Queue
## Top Blockers
## Core Evidence Packs
## Contract Playbook
## Human Review Notice
```

Running `npm run demo:json` prints the same deterministic report as structured JSON.

## 5. Dashboard Verification
Running `npm run dashboard:lint` and `npm run dashboard:build` verifies the Next.js reviewer portal in `dashboard/`.

```text
> @sebastianfoerste/ai-saas-legal-ops-starter-kit@1.0.0 dashboard:build
> npm run build && npm --prefix dashboard run build

✓ Compiled successfully in 1000ms
✓ Generating static pages (7/7)
```

## 6. Package and Audit Gates

Running `npm run check:package` builds the TypeScript package, imports the compiled entrypoint from `dist/src/index.js`, verifies root exports and the CLI bin path, and checks `npm pack --dry-run` output against the files whitelist.

Running `npm run audit:root` executes a strict production audit for root dependencies. Running `npm run audit:dashboard` executes the dashboard production audit and allows only the documented temporary Next/PostCSS advisory path until a safe upstream upgrade is available.
