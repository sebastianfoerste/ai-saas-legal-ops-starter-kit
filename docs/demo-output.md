# Illustrative Terminal Command Output

This document contains illustrative terminal output logs for the project's verification scripts. These logs show the expected behavior when running validation, testing, and typecheck commands locally.

---

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

---

## 2. Test Suite Execution
Running `npm run test` executes all unit tests verifying the deterministic risk-scoring engine.

```text
> @sebastianfoerste/ai-saas-legal-ops-starter-kit@1.0.0 test
> vitest run

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

 RUN  v1.6.1 /Users/sebastian/Developer/ai-saas-legal-ops-starter-kit

 ✓ tests/risk-scoring.test.ts  (13 tests) 4ms
 ✓ tests/schema-validation.test.ts  (6 tests) 34ms

 Test Files  2 passed (2)
      Tests  19 passed (19)
   Start at  2026-06-01 21:45:39
   Duration  280ms (transform 49ms, setup 0ms, collect 89ms, tests 38ms)
```

---

## 3. TypeScript Typecheck
Running `npm run typecheck` runs strict TypeScript checks over the codebase to ensure zero compilation or declaration errors.

```text
> @sebastianfoerste/ai-saas-legal-ops-starter-kit@1.0.0 typecheck
> tsc --noEmit

(Command completed with exit code 0 and no output, indicating all types are valid.)
```
