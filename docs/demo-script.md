# 5-Minute Recruiter & Founder Demo Script

This script shows how to inspect and run the AI SaaS Legal Ops Starter Kit in 5 minutes to verify its design and functionality.

## Step 1: Clone and Install (1 Minute)
Get the repository and install the development dependencies:
```bash
git clone https://github.com/sebastianfoerste/ai-saas-legal-ops-starter-kit.git
cd ai-saas-legal-ops-starter-kit
npm install
```

## Step 2: Explore Schemas & Examples (1 Minute)
Open the schema definitions and see how business terms are translated into validation rules:
*   `schemas/saas-contract-intake.schema.json` defines required fields for sales intakes.
*   `examples/saas-contract-intake.example.json` represents a synthetic negotiation matter for *Atlas Metrics Bank* with regulated-customer routing, custom liability caps, AI features, and a pending DORA exit strategy.

## Step 3: Run Example Validation (1 Minute)
Run the validation script to verify all synthetic examples align perfectly with their JSON schemas:
```bash
npm run validate:examples
```
This runs the test file `tests/schema-validation.test.ts` to validate the files in `examples/` against the JSON schemas in `schemas/`.

## Step 4: Run Unit Tests (1 Minute)
Verify the deterministic legal operations logic using Vitest:
```bash
npm run test
```
This executes:
1.  **Schema Validation Tests**: Confirms AJV properly parses formats.
2.  **Risk Scoring Engine Tests**: Asserts that high-risk inputs, for example model training on customer data, regulated customer status, sensitive data, and copyleft license type, correctly escalate to the General Counsel.
3.  **Legal Action Plan Tests**: Confirms each risk score is converted into approvals, blockers, follow-ups, and evidence requests.
4.  **Contract Playbook Tests**: Confirms SaaS contract deviations are converted into fallback positions, approvals, non-starters, and reviewer notes.
5.  **AI Governance Evidence Pack Tests**: Confirms product launch, AI vendor, and DPA matters produce deterministic evidence packs and Markdown review output.
6.  **Risk Register Tests**: Confirms multiple matters can be aggregated into portfolio-level counts, approval queues, overdue matters, and recommended actions.

## Step 5: Run the End-to-End Demo CLI (1 Minute)
Generate a full Markdown demo report from bundled public-safe examples:
```bash
npm run demo
```

For structured output:
```bash
npm run demo:json
```

The CLI validates examples, calculates risk, generates action plans, builds contract playbook reviews and AI governance evidence packs, aggregates the legal risk register, and prints a review-ready report.

## Step 6: Read Policies and Operating Model (1 Minute)
Open the markdown docs to understand the business value of this system:
*   `policies/human-review-policy.md` outlines the Human-in-the-Loop requirement and disclaimer.
*   `docs/operating-model.md` details how this transforms a corporate legal team from a bottleneck queue into a product platform.

## Optional Demo Moment: Evidence Pack Renderer
Open `tests/evidence-pack.test.ts` and inspect the `renderEvidencePackMarkdown` assertion. It demonstrates how a risky AI product launch can be converted from a structured intake into a deterministic review pack with missing evidence, approvals, and a human review notice.

## Optional Demo Moment: Contract Playbook Renderer
Open `tests/contract-playbook.test.ts` and inspect the `renderContractPlaybookMarkdown` assertion. It demonstrates how a negotiated SaaS contract intake can be converted into fallback positions, non-starters, approval requirements, and reviewer notes.

## Optional Demo Moment: Reviewer Dashboard
Run `npm run dashboard:dev`, open `http://localhost:3000`, and seed the Dust GC demo matters. The dashboard shows role-specific legal intake, evidence readiness, audit history, and General Counsel approval gates over the same deterministic rules used by the package.
