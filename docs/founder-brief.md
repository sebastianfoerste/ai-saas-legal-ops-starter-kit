# Founder Brief: Legal as Product Infrastructure

## 1. The Bottleneck: Legal as a Ticket Queue
In early-stage and high-growth startups, legal is typically treated as a reactive back-office cost center. A ticket queue model slows down business velocity: sales waits for contract approvals, product waits for feature compliance reviews, and engineering waits for open-source checks. 

This reactive posture forces legal teams to review identical clauses repeatedly, creating manual overhead and slowing down ARR execution.

## 2. The Solution: Legal as Product Infrastructure
A modern SaaS startup must treat legal as **product infrastructure**. Rather than routing every request to a lawyer, the legal team builds reusable workflows that expose policies as API-like gates. 

This creates three main benefits:
*   **Speed**: Business teams get immediate, self-serve answers.
*   **Scale**: Legal overhead scales sub-linearly with transaction volume.
*   **Auditability**: Every decision leaves a structured, machine-readable log.

## 3. How Self-Serve Workflows Improve Speed
By exposing validated markdown intake templates (e.g., `templates/saas-contract-intake.md`), sales and engineering can draft requests that align with standard company playbooks. If the input parameters match the pre-approved standard (e.g., low-value, standard liability, standard data categories), the risk scoring engine automatically flags it as `low` risk. This permits instant automated sign-off, bypassing the manual legal queue entirely.

## 4. How Human Review Gates Preserve Judgment
Automating triage does not mean replacing human judgment. Instead, the risk-scoring engine acts as an intelligent router. As defined in `policies/human-review-policy.md`, automated tools never produce final legal advice. When a request includes high-risk attributes (such as GDPR special category data or model training on customer prompts), it triggers an `escalate` rating. This generates a structured `escalation-note.md` and routes it to a human lawyer, ensuring legal expertise is focused where it is actually needed.

## 5. Turning Compliance into Operational Infrastructure
By representing legal requirements as structured data, compliance is woven into day-to-day operations:
*   **AI Vendor Governance**: Ensures that internal tools and APIs meet security standards before code is deployed.
*   **DPA Triage**: Programmatically matches customer privacy markups against regional hosting capabilities.
*   **Customer Commitment Tracking**: Logs custom obligations (such as dedicated AWS clusters or regional boundaries) as data, enabling infrastructure engineers to build alerting systems around contract requirements.
*   **Product Launch Governance**: Flags regulatory hurdles (such as EU AI Act compliance) in the design phase, avoiding costly post-launch re-architectures.
