# AI SaaS Legal Ops Starter Kit

### *A public-safe legal engineering starter kit for building the first legal operating layer inside an AI-native SaaS company.*

---

## Why This Matters

**Legal teams should not become ticket queues. They should become internal product teams that expose reusable legal workflows to sales, product, privacy, security, and leadership.**

In high-growth AI-native SaaS companies, traditional manual contracting, manual privacy reviews, and siloed compliance assessments create operational bottlenecks. By treating legal workflows as structured data validated by JSON schemas and evaluated via deterministic rule engines, legal engineering enables companies to scale fast, enforce regulatory boundaries, and maintain a machine-readable audit trail.

---

## What This Proves

This repository demonstrates:
1.  **Contracts as Code**: Defining business constraints (intakes, DPA structures, AI vendor reviews) using strict, testable JSON Schemas.
2.  **Deterministic Risk-Scoring**: Building automated risk classification models that isolate and escalate high-risk matters (such as model training on customer data, GDPR special category processing, or unvetted public claims) without manual, human-only pipelines.
3.  **Self-Serve Playbooks**: Transitioning operational controls to self-serve templates that business owners can complete and run through automated CI/CD compliance gates.
4.  **Recruiter & Engineering-Visible Excellence**: Professional TypeScript execution, comprehensive Vitest suites, and a structured legal operating model designed for AI-native platforms like *Dust*.

---

## Core Workflows

This starter kit covers 8 critical legal operations workflows:

1.  **SaaS Contract Intake**: Sales reps input deal terms. Automatically flags non-standard liability terms, regulated customers, or deployment changes.
2.  **DPA Triage**: Triage pipeline checking personal data scopes, Special Categories (GDPR Art. 9), subprocessor locations, and deletion SLAs.
3.  **AI Vendor Review**: Outlines security and privacy reviews of external AI model providers and third-party APIs before software integration.
4.  **Open-Source Licence Review**: Scans libraries for copyleft licenses (e.g. AGPL-3.0) and validates compatibility against distribution models.
5.  **Customer Commitment Tracking**: Logs custom obligations (such as regional residency or custom security) into a structured register.
6.  **Product Launch Legal Intake**: Pre-launch checklist matching product capabilities against marketing claims, privacy updates, and EU AI Act constraints.
7.  **Board Legal Risk Memo**: High-level risk updates summarizing active exposures, AI vendor status, and compliance posture for leadership.
8.  **Escalation Rules**: Deterministic rules dictating when a matter is routed directly to the General Counsel (`sebastianfoerste`).

---

## Repository Map

```text
ai-saas-legal-ops-starter-kit/
  ├── README.md                           # Starter kit documentation and instructions
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
  │   └── ai-vendor-use-policy.md         # Banned, permitted & restricted tools
  ├── docs/                               # Developer Guides
  │   ├── architecture.md                 # System flow chart and pipeline design
  │   ├── launch-readiness.md             # Production launch checklist
  │   ├── operating-model.md              # Shift from ticket queues to products
  │   └── demo-script.md                  # 5-minute review walkthrough
  └── tests/                              # Vitest Test Scaffolding
      ├── schema-validation.test.ts       # Automated schema-compliance verification
      └── risk-scoring.test.ts            # Triage scoring unit tests
```

---

## Demo Path

Verify validation and scoring engine compliance:
```bash
# Validate example payloads against schemas
npm run validate:examples

# Run full Vitest suite
npm run test
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
> **No automated workflow produces final legal advice.** Consequential decisions, contract execution, and regulatory filings require direct validation by a qualified human lawyer or the accountable internal owner (as defined in [human-review-policy.md](policies/human-review-policy.md)).

---

## Public Safety Note

All inputs, examples, and test data in this repository are **strictly synthetic and public-safe**. They contain no client data, personal data, commercial secrets, or privileged legal communication (see [data-boundary-policy.md](policies/data-boundary-policy.md)).

---

## Relevance for AI-Native SaaS Companies

AI-native platforms process significant amounts of client data through external model APIs. This repository implements the governance infrastructure required to:
*   Enforce **EU Data Boundaries** by ensuring vector and API requests do not fail over to un-approved hosting regions.
*   Prevent model contamination by blocking vendors who train base models on prompt inputs.
*   Classify releases under incoming legislation like the **EU AI Act**.

---

## How to Run

1.  **Prerequisites**: Install Node.js (v18+) and npm.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run tests**:
    ```bash
    npm run test
    ```
4.  **Run type check**:
    ```bash
    npm run typecheck
    ```

---

## License

This repository is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
