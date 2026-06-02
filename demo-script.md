# 2-Minute Recruiter Demo Script

This script shows how to inspect and run the AI SaaS Legal Ops Starter Kit in less than 2 minutes to verify its design and functionality.

## Step 1: Install & Run Validation (30 Seconds)
```bash
npm install
npm run validate:examples
```
This confirms that synthetic data examples for SaaS contracts, DPAs, and AI vendors conform to strict, testable JSON schemas.

## Step 2: Run Vitest Unit Tests (30 Seconds)
```bash
npm run test
```
Runs 55 tests verifying:
1.  **Risk scoring rules**: checks that high-risk inputs (e.g. model training on customer data, GDPR special category health data, AGPL license type) correctly escalate to the General Counsel.
2.  **Action plan generation**: confirms that each risk score is automatically converted into approvals, blockers, follow-ups, and evidence requests.
3.  **Contract playbook fallback positions**: maps SaaS contract deviations to fallback positions and reviewer notes.

## Step 3: Run the CLI Demo (30 Seconds)
```bash
npm run demo
```
Runs the end-to-end legal-ops report pipeline, aggregating matters into a board-ready legal risk register.

For structured output:
```bash
npm run demo:json
```

## Step 4: Inspect Key Architecture (30 Seconds)
- `src/risk-scoring.ts`: Deterministic, rules-based risk triage logic.
- `schemas/`: JSON schemas translating legal constraints into typescript validator boundaries.
- `what-this-proves.md`: Context on how this maps to a GC's product and operational challenges.
