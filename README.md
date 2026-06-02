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
3.  **Deterministic Action Plans**: Translating each risk score into required approvals, blockers, follow-ups, evidence requests, and audit-trail entries.
4.  **AI Governance Evidence Packs**: Mapping product, vendor, and DPA matters to EU AI Act, GDPR, NIST AI RMF, ISO/IEC 42001, DORA, and internal-policy evidence requirements.
5.  **Portfolio Risk Register Reporting**: Aggregating matters into board-ready counts, approval queues, overdue matters, blockers, and recommended actions.
6.  **Contract Playbook Reviews**: Translating SaaS contract deviations into fallback positions, non-starters, approvals, and reviewer notes.
7.  **Self-Serve CLI Demo**: Running the whole legal-ops workflow from bundled schemas and examples into Markdown or JSON reports.
8.  **Self-Serve Playbooks**: Turning operational controls into templates that business owners can complete and run through automated validation checks.
9.  **Production-Grade Design**: Clean TypeScript implementation, modular architectures, and structured workflows suitable for AI-native SaaS ecosystems.
10. **Engineering Legibility**: Typed workflows, Vitest tests, and clear run paths that engineering and legal can inspect together.

See [What This Proves for a General Counsel Candidate](what-this-proves.md) and [Sample Output Logs](sample-output.md) for more details.

---

## Why This Matters for a General Counsel Role

A first legal hire at an AI-native SaaS company should design the legal operating system: intake, templates, escalation paths, risk registers, customer commitments, privacy positions, AI vendor controls, board reporting, and external counsel strategy. This repository demonstrates how that operating system can be expressed as structured workflows rather than informal, un-audited legal inbox traffic.

---

## Core Workflows

This starter kit covers 13 critical legal operations workflows:

1.  **SaaS Contract Intake**: Sales reps input deal terms. The workflow flags non-standard liability terms, regulated customers, or deployment changes.
2.  **DPA Triage**: Triage pipeline checking personal data scopes, GDPR special category data, subprocessor locations, and deletion SLAs.
3.  **AI Vendor Review**: Security, privacy, and model-provider review before external AI model providers or third-party APIs are integrated.
4.  **Open-Source Licence Review**: Review of copyleft licences, including AGPL-3.0, and compatibility against distribution models.
5.  **Customer Commitment Tracking**: Structured logging of custom obligations such as regional data residency or custom security terms.
6.  **Product Launch Legal Intake**: Pre-launch checklist matching product capabilities against marketing claims, privacy updates, and EU AI Act constraints.
7.  **Board Legal Risk Memo**: Leadership-level summary of active exposures, AI vendor status, and compliance posture.
8.  **Escalation Rules**: Deterministic routing when a matter requires General Counsel review.
9.  **Legal Action Plan Generation**: Converts validated payloads and risk scores into review queue artifacts with approvals, blockers, follow-ups, and evidence requirements.
10. **AI Governance Evidence Pack Generation**: Produces typed JSON and deterministic Markdown evidence packs for AI, product, privacy, and regulated-sector review.
11. **Legal Risk Register Reporting**: Aggregates multiple matters into a portfolio-level executive summary, approval queue, and remediation list.
12. **Contract Playbook Review**: Converts SaaS contract deviations into internal negotiation guidance and fallback positions.
13. **Self-Serve Demo CLI**: Produces end-to-end Markdown or JSON reports from the bundled public-safe example payloads.

---

## For AI Operator Platforms

For AI-native platforms running agents on customer data, the legal layer needs to move at product speed. This kit models legal workflows as reusable internal product infrastructure: self-serve where possible, escalated where necessary, and always auditable. It is especially relevant to contract intake agents, DPA triage, AI vendor review, customer commitment registers, product counsel routing, and board-ready risk reporting with human approval gates.

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
  │   ├── cli.ts                          # End-to-end demo CLI
  │   ├── validate.ts                     # Ajv JSON Schema validator utility
  │   ├── risk-scoring.ts                 # Rules-based deterministic risk engine
  │   ├── action-plan.ts                  # Deterministic legal action plan generator
  │   ├── contract-playbook.ts            # SaaS contract playbook review generator
  │   ├── evidence-pack.ts                # AI governance evidence pack generator
  │   ├── risk-register.ts                # Portfolio-level risk register summary
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
      ├── risk-scoring.test.ts            # Triage scoring unit tests
      ├── action-plan.test.ts             # Legal action plan unit tests
      ├── cli.test.ts                     # End-to-end demo CLI tests
      ├── contract-playbook.test.ts       # SaaS contract playbook tests
      ├── evidence-pack.test.ts           # AI governance evidence pack tests
      └── risk-register.test.ts           # Portfolio register unit tests
```

---

## Demo Path

Verify validation, scoring, action planning, evidence packs, and risk register compliance:

```bash
npm install
npm run validate:examples
npm run test
npm run typecheck
npm run demo
```

### Real-Time Demo Output Excerpt
Here is the structured validation, risk triage, and action plan output generated by running the demo CLI:

```text
# AI SaaS Legal Ops Demo Report

- Generated At: 2026-06-02T12:30:09.977Z
- Examples Valid: 6/6
- Portfolio Summary: 6 matters reviewed. 6 matters are escalated, 6 require human review.

## Matter Overview

| Workflow | Validation | Risk | Review Gate | Evidence Readiness |
| --- | --- | --- | --- | --- |
| SaaS Contract Intake | valid | escalate | gc-review | blocked |
| DPA Triage          | valid | escalate | gc-review | blocked |
| AI Vendor Review     | valid | escalate | gc-review | blocked |
| Open-Source Review   | valid | escalate | gc-review | blocked |
| Customer Commitment  | valid | escalate | gc-review | blocked |
| Product Launch Intake | valid | escalate | gc-review | blocked |

## Approval Queue

- GC Approval: 6 matters (escalate)
- Senior Legal Review: 6 matters (escalate)
- DPO Sign-off: 4 matters (escalate)

## Top Blockers

- Blocker: Customer demands training opt-out verification audited by third-party weekly
- Blocker: Involves a regulated customer (regulatedCustomer: true)
- Blocker: Contains GDPR Art. 9 Special Category Data (health data, biometric data)
- Blocker: Non-standard retention period: Indefinite retention of customer inputs for fine-tuning
```

---

## Standard Risk Output Contract

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

## Legal Action Plan Output Contract

The action plan generator converts the risk output into an operational review package:

```ts
import { createLegalActionPlan } from '@sebastianfoerste/ai-saas-legal-ops-starter-kit';

const plan = createLegalActionPlan('ProductLaunchIntake', payload);
```

Example output shape:

```json
{
  "reviewGate": "gc-review",
  "priority": "blocked",
  "nextAction": "Route to the GC review queue with source payload, triggered reasons, and proposed remediation.",
  "requiredApprovals": [
    "DPO Sign-off",
    "Product Owner Approval",
    "GC Approval"
  ],
  "blockers": [
    "Resolve before approval: Launch includes unvetted, high-risk public claims: Produces zero hallucinations and is 100% accurate"
  ],
  "followUps": [
    "Request evidence for each public claim and hold publication until claims review is complete."
  ],
  "evidenceToCollect": [
    "Claims substantiation file with test method, sample, owner, and approval record."
  ]
}
```

## AI Governance Evidence Pack Output Contract

The evidence-pack generator converts product launch, AI vendor, and DPA matters into structured review evidence:

```ts
import {
  createEvidencePack,
  renderEvidencePackMarkdown
} from '@sebastianfoerste/ai-saas-legal-ops-starter-kit';

const pack = createEvidencePack('ProductLaunchIntake', payload);
const markdown = renderEvidencePackMarkdown(pack);
```

Example output shape:

```json
{
  "schemaType": "ProductLaunchIntake",
  "matterName": "AutoDraft Agent v2",
  "readiness": "blocked",
  "humanReviewRequired": true,
  "items": [
    {
      "id": "product.human_oversight",
      "title": "Human oversight design",
      "framework": "eu_ai_act",
      "status": "missing",
      "priority": "critical",
      "sourceFields": [
        "aiFeatures",
        "regulatoryImpact"
      ],
      "evidenceRequired": [
        "Human oversight description, reviewer role, override path, and escalation trigger design."
      ],
      "rationale": "AI product launches need evidence that consequential outputs remain subject to accountable human oversight."
    }
  ],
  "missingEvidence": [
    {
      "id": "product.human_oversight",
      "status": "missing",
      "priority": "critical"
    }
  ]
}
```

## Self-Serve CLI Demo

The demo CLI runs the bundled public-safe examples through the full legal-ops pipeline:

```bash
npm run demo
npm run demo:json
```

It validates every example, calculates deterministic risk, generates legal action plans, produces evidence packs, aggregates the portfolio risk register, and prints either Markdown or JSON.

Example Markdown sections:

```text
# AI SaaS Legal Ops Demo Report

## Matter Overview
## Approval Queue
## Top Blockers
## Core Evidence Packs
## Human Review Notice
```

## Contract Playbook Review Output Contract

The contract playbook review converts SaaS contract deviations into internal negotiation guidance:

```ts
import {
  createContractPlaybookReview,
  renderContractPlaybookMarkdown
} from '@sebastianfoerste/ai-saas-legal-ops-starter-kit';

const review = createContractPlaybookReview(payload);
const markdown = renderContractPlaybookMarkdown(review);
```

Example output shape:

```json
{
  "customer": "Acme Health Systems",
  "contractType": "MSA",
  "risk": {
    "level": "escalate"
  },
  "deviations": [
    {
      "id": "liability.super_cap",
      "category": "liability",
      "severity": "requires_approval",
      "fallbackPosition": "Offer a capped security or privacy super-cap up to 2x annual fees, subject to final legal and finance approval."
    }
  ],
  "nonStarters": [],
  "approvalRequired": [
    "GC Approval",
    "Senior Legal Review",
    "Finance Approval"
  ]
}
```

## Legal Risk Register Output Contract

The risk register aggregates multiple matters into a portfolio-level legal operations summary:

```ts
import { createLegalRiskRegister } from '@sebastianfoerste/ai-saas-legal-ops-starter-kit';

const register = createLegalRiskRegister([
  {
    id: 'matter-001',
    name: 'AutoDraft Agent v2 Launch',
    schemaType: 'ProductLaunchIntake',
    data: payload
  }
]);
```

Example output shape:

```json
{
  "totalMatters": 3,
  "countsByRisk": {
    "low": 1,
    "medium": 0,
    "high": 0,
    "escalate": 2
  },
  "countsByReviewGate": {
    "self-serve": 1,
    "legal-review": 0,
    "senior-legal-review": 0,
    "gc-review": 2
  },
  "executiveSummary": "3 matters reviewed. 2 matters are high-risk or escalated, and 2 matters require human review. 1 matter is overdue.",
  "recommendedActions": [
    "Route 2 escalated matters to GC review before approval, launch, or customer commitment.",
    "Clear 1 overdue matter or reset the accountable review date."
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
5.  Run the end-to-end demo report:
    ```bash
    npm run demo
    npm run demo:json
    ```

---

## License

This repository is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
