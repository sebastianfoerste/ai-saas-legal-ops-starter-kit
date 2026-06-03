# Review This Repository in 3 Minutes

This repository is meant to be reviewed as a practical legal operating layer for an AI-native SaaS company, not as a theoretical compliance memo.

## What to inspect first

1. `schemas/` for the structured intake contracts.
2. `examples/` for synthetic public-safe payloads.
3. `src/risk-scoring.ts` for deterministic escalation logic.
4. `src/action-plan.ts` for the conversion from risk triggers into approvals, blockers, follow-ups and evidence requests.
5. `src/evidence-pack.ts` and `src/risk-register.ts` for portfolio-level reporting.
6. `policies/human-review-policy.md` for the human approval boundary.

## Fast demo path

```bash
npm install
npm run validate:examples
npm run test
npm run typecheck
npm run demo
```

## What this should signal

The useful pattern is not that legal judgment is automated. The useful pattern is that recurring legal work is structured before it reaches a lawyer: intake is typed, risk triggers are visible, approvals are routed, customer commitments are captured, and board-level exposure can be reported from the same underlying data.

## Review boundary

All examples are synthetic and public-safe. No client data, privileged material, confidential information or personal data is included.
