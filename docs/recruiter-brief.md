# Recruiter Brief: What This Repository Proves

## 1. Who This Repository Is For
This repository is built for **Founders, Engineering Leaders, and Legal Operations Executives** looking for a General Counsel or Head of Legal who can build self-serve, scale-ready legal infrastructure. It shows how recurring legal workflows are turned into reusable, validated, and programmatically triaged code.

## 2. What Problem It Solves
Traditional legal teams become operational bottlenecks in fast-growing software companies. Business teams send unstructured requests (such as contract markups, vendor sign-ups, and release schedules) to a shared inbox, requiring manual review from scratch. 

This repository replaces the bottleneck with an **automated triage pipeline**:
*   Standardizing legal requests as structured data inputs (JSON).
*   Enforcing syntax and field completeness through schema validation (JSON Schema).
*   Evaluating risk levels deterministically (TypeScript rules) to auto-approve low-risk matters and route high-risk cases directly to counsel.

## 3. Why It Matters for an AI-Native SaaS General Counsel
An AI-native SaaS company processes large quantities of data through third-party APIs and custom models. A General Counsel in this role cannot just write policy memos; they must build boundaries directly into the product lifecycle. This kit implements:
*   **AI Vendor Governance**: Automatically blocking vendors that train base models on prompt inputs.
*   **EU Data Boundaries**: Flagging cloud transfers that violate residency commitments.
*   **Compliance Gates**: Automatically triaging launches against the EU AI Act.

## 4. Technical Skills Demonstrated
*   **TypeScript & Node.js**: Clean, strict-mode implementation using typed ES Modules (`NodeNext`).
*   **Schema Engineering**: Structured JSON Schemas parsing emails, dates, and nested structures.
*   **Testing Discipline**: Vitest suite with 100% test passing rates on complex boundary checks.
*   **CI/CD Configuration**: GitHub Actions workflows validating code quality, type checks, and tests on push.

## 5. Legal & Operational Skills Demonstrated
*   **Systems Thinking**: Designing an end-to-end triage pipeline: *Intake → Validation → Risk Scoring → Human Review Gate → Playbook Update*.
*   **Policy Codification**: Drafting structured operational playbooks (AI vendor rules, data boundaries, and human review mandates) that translate legal principles into business rules.
*   **Risk Triage**: Mappings deterministic legal, regulatory (HIPAA, GDPR, DORA), and commercial risks into clear decision matrices.

## 6. How to Review This Repo in Five Minutes
*   **Read the Architecture Flow**: Open `docs/architecture.md` to see the Mermaid data pipeline chart.
*   **Inspect the Core Logic**: View `src/risk-scoring.ts` to see how the 9 deterministic escalation rules are implemented in clean code.
*   **Verify the Tests**: Check `tests/risk-scoring.test.ts` to see the synthetic edge cases tested.
*   **Confirm Validations**: Run `npm run validate:examples` to see the JSON schemas in action.
