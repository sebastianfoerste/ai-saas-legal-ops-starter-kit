# Output contracts

The workflows emit typed, deterministic results that are safe to review locally. The
examples below show the public-safe shapes exposed by the built package.

## Standard Risk Output Contract

The scoring engine parses payloads and outputs structured data representing the matter's
status and trigger conditions:

```json
{
  "level": "escalate",
  "reasons": [
    "Involves a regulated customer (regulatedCustomer: true)",
    "Customer operates in sensitive sector: Finance",
    "DORA exit strategy is incomplete or pending: pending"
  ]
}
```

## Legal Action Plan Output Contract

> The snippets below import from the built local output. This package is not published
> to npm; clone the repo and `npm run build`, then import from `dist/`.

The action plan generator converts the risk output into an operational review package:

```ts
import { createLegalActionPlan } from './dist/src/index.js';

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

The evidence-pack generator converts product launch, AI vendor, and DPA matters into
structured review evidence:

```ts
import {
  createEvidencePack,
  renderEvidencePackMarkdown
} from './dist/src/index.js';

const pack = createEvidencePack('ProductLaunchIntake', payload);
const markdown = renderEvidencePackMarkdown(pack);
```

Example output shape:

```json
{
  "schemaType": "ProductLaunchIntake",
  "matterName": "Workspace Agent Builder for Regulated Teams",
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

## Regulatory Obligation Matrix Output Contract

The matrix generator converts the same payload into reviewer-facing obligation rows:

```ts
import {
  createRegulatoryObligationMatrix,
  renderRegulatoryObligationMatrixMarkdown
} from './dist/src/index.js';

const matrix = createRegulatoryObligationMatrix('ProductLaunchIntake', payload);
const markdown = renderRegulatoryObligationMatrixMarkdown(matrix);
```

The matrix covers AI Act role classification, prohibited-practices screening, Annex III
screening, GPAI dependency evidence, Article 50 transparency, DORA register-of-information
fields, GDPR DPIA and TIA evidence, Data Act switching support, Cyber Resilience Act
software evidence, and OWASP GenAI controls where applicable. Each row includes obligation,
framework, trigger, source fields, evidence required, owner, review gate, readiness, and
rationale.

## Decision Packet and Approval Gate Output Contract

Decision packets are local reviewer exports:

```ts
import {
  createDecisionPacket,
  renderDecisionPacketMarkdown
} from './dist/src/index.js';

const packet = createDecisionPacket({
  schemaType: 'SaaSContractIntake',
  data: payload,
  approvalRecords,
  reviewerNote: 'Reviewed for demo export.'
});
const markdown = renderDecisionPacketMarkdown(packet);
```

Each packet includes the source payload, validation result, risk reasons, action plan,
approval gate, evidence pack, regulatory matrix, SaaS contract playbook deviations where
applicable, reviewer note, transition history, human-review notice, and a local SHA-256
manifest covering each section plus an overall digest.

The approval gate blocks export when the deterministic action plan still has blockers, a
required approval is missing, or any required approval has been rejected. This is an
internal workflow gate only. It is draft support for a qualified reviewer and is never
legal advice.

CLI access:

```bash
node dist/src/cli.js policy-health
node dist/src/cli.js matrix --type ProductLaunchIntake --input examples/product-launch-intake.example.json
node dist/src/cli.js export-decision --type ProductLaunchIntake --input examples/product-launch-intake.example.json --approval-records examples/product-launch-approval-records.example.json
```

## Self-Serve CLI Demo

The demo CLI runs the bundled public-safe examples through the full legal-ops pipeline:

```bash
npm run demo
npm run demo:json
```

It validates every example, calculates deterministic risk, generates legal action plans,
produces evidence packs, aggregates the portfolio risk register, and prints either
Markdown or JSON.

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

The contract playbook review converts SaaS contract deviations into internal negotiation
guidance:

```ts
import {
  createContractPlaybookReview,
  renderContractPlaybookMarkdown
} from './dist/src/index.js';

const review = createContractPlaybookReview(payload);
const markdown = renderContractPlaybookMarkdown(review);
```

Example output shape:

```json
{
  "customer": "Atlas Metrics Bank",
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

The risk register aggregates multiple matters into a portfolio-level legal operations
summary:

```ts
import { createLegalRiskRegister } from './dist/src/index.js';

const register = createLegalRiskRegister([
  {
    id: 'matter-001',
    name: 'Workspace Agent Builder for Regulated Teams Launch',
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
