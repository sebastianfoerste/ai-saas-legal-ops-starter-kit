# Agent Guide: AI SaaS Legal Ops Starter Kit

## Local Rules

1. Use synthetic or approved public data only.
2. Keep legal, privacy, security and product approvals review-gated.
3. Do not add external sending, publication or customer communication actions.
4. Treat generated reports as internal review drafts.
5. Prefer typed TypeScript modules and Vitest coverage for new workflow logic.
6. Keep dashboard behavior aligned with the deterministic core package.

## Validation

Run the smallest relevant test first, then the package gate when scope permits:

```bash
npm run test -- tests/ai-vendor-diligence.test.ts
npm run test
npm run typecheck
```
