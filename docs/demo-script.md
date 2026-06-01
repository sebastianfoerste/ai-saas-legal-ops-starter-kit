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
*   `examples/saas-contract-intake.example.json` represents a synthetic negotiation matter for *Acme Health Systems* with custom liability caps and AI features.

## Step 3: Run Example Validation (1 Minute)
Run the validation script to verify all synthetic examples align perfectly with their JSON schemas:
```bash
npm run validate:examples
```
This runs the test file `tests/schema-validation.test.ts` to validate the files in `examples/` against the JSON schemas in `schemas/`.

## Step 4: Run Unit Tests (1 Minute)
Verify the deterministic risk-scoring logic using Vitest:
```bash
npm run test
```
This executes:
1.  **Schema Validation Tests**: Confirms AJV properly parses formats.
2.  **Risk Scoring Engine Tests**: Asserves that high-risk inputs (e.g. model training on customer data, GDPR special category health data, AGPL license type) correctly escalate to the General Counsel.

## Step 5: Read Policies and Operating Model (1 Minute)
Open the markdown docs to understand the business value of this system:
*   `policies/human-review-policy.md` outlines the Human-in-the-Loop requirement and disclaimer.
*   `docs/operating-model.md` details how this transforms a corporate legal team from a bottleneck queue into a product platform.
