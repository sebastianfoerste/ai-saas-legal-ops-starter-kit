# Testing: AI SaaS Legal Ops Starter Kit

## Focused Feature Check

```bash
npm run test -- tests/ai-vendor-diligence.test.ts
```

## Core Test Suite

```bash
npm run test
```

## Type Check

```bash
npm run typecheck
```

## Package Check

```bash
npm run check:package
```

## Dashboard Checks

```bash
npm run dashboard:build
npm run dashboard:lint
```

## Quality Expectations

1. Tests use synthetic examples only.
2. Export remains blocked until required approvals are recorded and blockers are resolved.
3. Public or demo reports avoid client, candidate, matter, account and privileged data.
4. Legal outputs stay framed as review drafts.
