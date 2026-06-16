# 5-Minute Evaluator Demo Script

This script shows the legal operating layer through five synthetic flows: contract intake, DPA triage, AI vendor review, open-source licence check, and launch governance.

## 1. Install and verify the examples

```bash
npm install
npm run validate:examples
```

This checks that the bundled public-safe payloads match the JSON schemas in `schemas/`.

## 2. Run the deterministic test gate

```bash
npm run test
npm run typecheck
```

The tests cover schema validation, deterministic risk scoring, action-plan routing, contract playbook review, evidence packs, approval-gated decision packets, and the portfolio risk register.

## 3. Run the five-flow CLI demo

```bash
npm run demo
npm run demo:json
```

The report runs these synthetic matters:

1. SaaS contract intake: `examples/saas-contract-intake.example.json`.
2. DPA triage: `examples/dpa-triage.example.json`.
3. AI vendor review: `examples/ai-vendor-review.example.json`.
4. Open-source licence check: `examples/open-source-review.example.json`.
5. Launch governance: `examples/product-launch-intake.example.json`.

The output surfaces the board risk register, approval queue, blockers, evidence requests, and human review notice.

## 4. Inspect the launch approval gate

```bash
npm run build
node dist/src/cli.js export-decision --type ProductLaunchIntake --input examples/product-launch-intake.example.json --approval-records examples/product-launch-approval-records.example.json --format json
```

Inspect `approvalGate.exportAllowed`. The sample approval file intentionally approves only product, security, and DPO review. Senior legal, General Counsel, and regulatory counsel remain missing, so export stays blocked.

## 5. Inspect the proof surfaces

Open these files:

1. `docs/schema-reference.md` for the intake contract of each workflow.
2. `examples/approval-gate-output.json` for a static blocked-export snapshot.
3. `examples/board-risk-register-output.md` for a human-readable risk-register snapshot.
4. `src/risk-scoring.ts` for deterministic checks.
5. `src/approval-gate.ts` for the human approval gate.

All materials are synthetic. The repository produces draft internal workflow artifacts only and does not provide legal advice.
