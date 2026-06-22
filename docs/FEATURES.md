# Features: AI SaaS Legal Ops Starter Kit

## AI Vendor Diligence

Creates a reviewer packet for external AI tools and model providers. The packet combines deterministic risk scoring, legal action planning, AI governance evidence, required approvals and an export approval gate.

Implementation:

1. `src/ai-vendor-diligence.ts`
2. `src/risk-scoring.ts`
3. `src/action-plan.ts`
4. `src/evidence-pack.ts`
5. `src/approval-gate.ts`
6. `tests/ai-vendor-diligence.test.ts`

## Decision Packets

Produces local reviewer exports with source payload, validation result, risk reasons, action plan, evidence pack, regulatory matrix, contract playbook deviations where applicable, reviewer note, transition history and SHA-256 manifest.

Implementation:

1. `src/decision-packet.ts`
2. `tests/decision-packet.test.ts`

## Risk Register

Aggregates matters into board-ready counts, approval queues, overdue matters, blockers and recommended actions.

Implementation:

1. `src/risk-register.ts`
2. `tests/risk-register.test.ts`

## Dashboard Demo

Provides a local Next.js reviewer cockpit over synthetic matters. It exposes risk reasons, evidence gaps, playbook fallback positions, audit history and General Counsel decision gates.

Implementation:

1. `dashboard/src/app/page.tsx`
2. `dashboard/src/app/api/matters/seed/route.ts`
