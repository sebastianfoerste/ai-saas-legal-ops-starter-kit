# Evaluator Demo Script

Use this path to review the repository quickly and verify that the same deterministic rules drive the CLI, test suite, and optional dashboard.

## Install

```bash
npm install
```

## Validate the intake layer

```bash
npm run validate:examples
```

Review `schemas/` and `examples/` together. The schemas define the intake contracts. The examples are synthetic matters that exercise SaaS contracting, DPA review, AI vendor review, open-source review, customer commitments, and product launch governance.

## Run the legal engineering gate

```bash
npm run test
npm run typecheck
```

The test suite proves that deterministic rules escalate high-risk DPAs, customer-data model training, non-standard liability positions, missing subprocessors, and launch exports without required approvals.

## Generate the board risk register

```bash
npm run demo
npm run demo:json
```

The report shows matter risk, review gates, approval queues, blockers, evidence readiness, regulatory matrix gaps, and the human review notice.

## Generate a blocked decision packet

```bash
npm run build
node dist/src/cli.js export-decision --type ProductLaunchIntake --input examples/product-launch-intake.example.json --approval-records examples/product-launch-approval-records.example.json --format json
```

The approval records intentionally leave required legal approvals open. The resulting packet should show `approvalGate.status` as `blocked` and `approvalGate.exportAllowed` as `false`.

## Optional dashboard

```bash
npm --prefix dashboard install
npm run dashboard:dev
```

Open `http://localhost:3000` and seed the synthetic demo. The dashboard is a review surface over the same TypeScript rules. The package code remains the source of truth for classification, routing, approval states, and risk-register output.
