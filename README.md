# AI SaaS Legal Ops Starter Kit

[![CI Status](https://github.com/sebastianfoerste/ai-saas-legal-ops-starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianfoerste/ai-saas-legal-ops-starter-kit/actions/workflows/ci.yml)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Testing: Vitest](https://img.shields.io/badge/Testing-Vitest-yellow?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Data Safety: Public Safe](https://img.shields.io/badge/Data%20Safety-Public%20Safe-success?style=flat-square)](#public-safety-note)

### *A public-safe legal engineering starter kit for building the first legal operating layer inside an AI-native SaaS company.*

---

## Why This Matters

**Legal teams should not become ticket queues. They should become internal product teams that expose reusable legal workflows to sales, product, privacy, security, and leadership.**

In high-growth AI-native SaaS companies, traditional manual contracting, manual privacy reviews, and siloed compliance assessments create operational bottlenecks. By treating legal workflows as structured data validated by JSON schemas and evaluated via deterministic rule engines, legal engineering enables companies to scale fast, enforce regulatory boundaries, and maintain a machine-readable audit trail.

---

## What This Proves

This repository demonstrates:

1.  **Contracts as Code**: Defining business constraints for intakes, DPA structures, and AI vendor reviews using strict, testable JSON Schemas.
2.  **Deterministic Risk Scoring**: Building automated risk classification models that isolate and escalate high-risk matters (such as model training on customer data, GDPR special category processing, or unvetted public claims) without manual, human-only pipelines.
3.  **Self-Serve Playbooks**: Turning operational controls into templates that business owners can complete and run through automated validation checks.
4.  **Production-Grade Design**: Clean TypeScript implementation, modular architectures, and structured workflows suitable for AI-native SaaS ecosystems.

---

## Why This Matters for a General Counsel Role

A first legal hire at an AI-native SaaS company should design the legal operating system: intake, templates, escalation paths, risk registers, customer commitments, privacy positions, AI vendor controls, board reporting, and external counsel strategy. This repository demonstrates how that operating system can be expressed as structured workflows rather than informal, un-audited legal inbox traffic.

---

## Core Workflows

This starter kit covers 8 critical legal operations workflows:

1.  **SaaS Contract Intake**: Sales reps input deal terms. The workflow flags non-standard liability terms, regulated customers, or deployment changes.
2.  **DPA Triage**: Triage pipeline checking personal data scopes, GDPR special category data, subprocessor locations, and deletion SLAs.
3.  **AI Vendor Review**: Security, privacy, and model-provider review before external AI model providers or third-party APIs are integrated.
4.  **Open-Source Licence Review**: Review of copyleft licences, including AGPL-3.0, and compatibility against distribution models.
5.  **Customer Commitment Tracking**: Structured logging of custom obligations such as regional data residency or custom security terms.
6.  **Product Launch Legal Intake**: Pre-launch checklist matching product capabilities against marketing claims, privacy updates, and EU AI Act constraints.
7.  **Board Legal Risk Memo**: Leadership-level summary of active exposures, AI vendor status, and compliance posture.
8.  **Escalation Rules**: Deterministic routing when a matter requires General Counsel review.

---

## Dust-Style AI Operator Relevance

For AI operator companies, the legal layer needs to move at product speed. This kit models legal workflows as reusable internal product infrastructure: self-serve where possible, escalated where necessary, and always auditable. It is especially relevant to contract intake agents, DPA triage, AI vendor review, customer commitment registers, product counsel routing, and board-ready risk reporting with human approval gates.

---

## Repository Map

```text
ai-saas-legal-ops-starter-kit/
  ├── README.md                           # Starter kit documentation and instructions
  ├── ROADMAP.md                          # Future expansion phases (UI, agent layer)
  ├── CONTRIBUTING.md                     # Data safety and testing contribution rules
  ├── LICENSE                             # MIT License
  ├── .gitignore                          # Git ignore configuration
  ├── package.json                        # NPM build and validation script definitions
  ├── tsconfig.json                       # Compiler configurations
  ├── vitest.config.ts                    # Vitest test runner setup
  ├── src/                                # Core Legal Engineering Logic
  │   ├── validate.ts                     # Ajv JSON Schema validator utility
  │   ├── risk-scoring.ts                 # Rules-based deterministic risk engine
  │   └── index.ts                        # Main library exports
  ├── schemas/                            # JSON Schema Definitions
  │   ├── saas-contract-intake.schema.json
  │   ├── dpa-triage.schema.json
  │   ├── ai-vendor-review.schema.json
  │   ├── open-source-review.schema.json
  │   ├── customer-commitment.schema.json
  │   └── product-launch-intake.schema.json
  ├── examples/                           # Synthetic & Public-Safe JSON Payloads
  │   ├── saas-contract-intake.example.json
  │   ├── dpa-triage.example.json
  │   ├── ai-vendor-review.example.json
  │   ├── open-source-review.example.json
  │   ├── customer-commitment.example.json
  │   └── product-launch-intake.example.json
  ├── templates/                          # Self-Serve Markdown Templates
  │   ├── saas-contract-intake.md
  │   ├── dpa-triage.md
  │   ├── ai-vendor-review.md
  │   ├── open-source-licence-review.md
  │   ├── customer-commitment-register.md
  │   ├── product-launch-legal-intake.md
  │   ├── board-legal-risk-memo.md
  │   └── escalation-note.md
  ├── policies/                           # Operational Policies & Playbooks
  │   ├── escalation-rules.md             # Routing rules to GC
  │   ├── human-review-policy.md          # Oversight mandates
  │   ├── data-boundary-policy.md         # Synthetic data boundaries
  │   └── ai-vendor-use-policy.md         # Permitted, restricted, and prohibited AI vendor uses
  ├── docs/                               # Developer Guides & Briefs
  │   ├── architecture.md                 # System flow chart and pipeline design
  │   ├── launch-readiness.md             # Production launch checklist
  │   ├── operating-model.md              # Shift from ticket queues to products
  │   ├── recruiter-brief.md              # Brief: What this repository proves
  │   ├── founder-brief.md                # Brief: Legal as product infrastructure
  │   ├── demo-output.md                  # Illustrative validation/test output logs
  │   ├── screenshots.md                  # UI and terminal visualization references
  │   └── demo-script.md                  # 5-minute review walkthrough
  └── tests/                              # Vitest Test Scaffolding
      ├── schema-validation.test.ts       # Automated schema-compliance verification
      └── risk-scoring.test.ts            # Triage scoring unit tests
```

---

## Demo Path

Verify validation and scoring engine compliance:

```bash
npm install
npm run validate:examples
npm run test
npm run typecheck
```

---

## Standard Output Contract

The scoring engine parses payloads and outputs structured data representing the matter's status and trigger conditions:

```json
{
  "level": "escalate",
  "reasons": [
    "AI Vendor trains base models on customer data inputs",
    "Contains sensitive or high-risk data categories: patient records, medical history",
    "Non-standard retention position: Indefinite retention of customer inputs for fine-tuning"
  ]
}
```

---

## Human Review Rule

> [!IMPORTANT]
> **No automated workflow produces final legal advice.** Consequential decisions, contract execution, and regulatory filings require direct validation by a qualified human lawyer or the accountable internal owner defined in [human-review-policy.md](policies/human-review-policy.md).

---

## Public Safety Note

All inputs, examples, and test data in this repository are **strictly synthetic and public-safe**. They contain no client data, personal data, commercial secrets, or privileged legal communication. See [data-boundary-policy.md](policies/data-boundary-policy.md).

---

## Relevance for AI-Native SaaS Companies

AI-native platforms process significant amounts of client data through external model APIs. This repository implements governance infrastructure designed to:

*   Enforce EU data-boundary positions by ensuring vector and API requests do not fail over to unapproved hosting regions.
*   Prevent model contamination by blocking vendors who train base models on prompt inputs.
*   Classify releases under incoming legislation such as the EU AI Act.
*   Preserve a customer commitment register so sales, product, security, and legal know which promises have been made.

---

## How to Run

1.  Install Node.js v18+ and npm.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run tests:
    ```bash
    npm run test
    ```
4.  Run type check:
    ```bash
    npm run typecheck
    ```

---

## License

This repository is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
