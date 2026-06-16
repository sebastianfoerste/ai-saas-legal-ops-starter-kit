# Schema Reference

This repository uses JSON schemas as the public-safe intake layer for recurring AI SaaS legal work. Each payload is synthetic. The schemas define the fields that can enter the deterministic rules, evidence packs, approval gates, and risk register.

## SaaS Contract Intake

File: `schemas/saas-contract-intake.schema.json`

Example: `examples/saas-contract-intake.example.json`

Purpose: Capture deal terms, customer sector, requested deviations, data-processing position, AI features, DORA exit position, and requested approvals.

Reviewer use: Flags regulated customers, non-standard liability caps, sensitive deployment terms, red flags, and contract-playbook deviations.

## DPA Triage

File: `schemas/dpa-triage.schema.json`

Example: `examples/dpa-triage.example.json`

Purpose: Capture controller or processor role, data subjects, personal-data categories, special-category data, subprocessors, transfer locations, retention, deletion, security annex status, and missing facts.

Reviewer use: Escalates special-category data, unclear subprocessors, missing subprocessors, transfer uncertainty, and deletion or retention positions that need privacy review.

## AI Vendor Review

File: `schemas/ai-vendor-review.schema.json`

Example: `examples/ai-vendor-review.example.json`

Purpose: Capture vendor, tool, use case, business owner, data entered, output use, retention, model-training position, subprocessors, security material, prohibited uses, and approval conditions.

Reviewer use: Blocks or escalates model training on customer data, unclear logging, missing zero-data-retention evidence, unverified subprocessors, and vendor use before security and privacy review.

## Open-Source Review

File: `schemas/open-source-review.schema.json`

Example: `examples/open-source-review.example.json`

Purpose: Capture package, licence, distribution model, linking pattern, modification status, copyleft concern, approval status, and engineering owner.

Reviewer use: Escalates strong copyleft risk, rejected or escalated approval status, attribution gaps, and distribution patterns that need legal and engineering sign-off.

## Customer Commitment

File: `schemas/customer-commitment.schema.json`

Example: `examples/customer-commitment.example.json`

Purpose: Capture customer commitment text, source document, owner, operational dependency, status, renewal relevance, and next review date.

Reviewer use: Places custom commitments into the risk register, highlights overdue or at-risk commitments, and keeps sales, product, security, and legal aligned on operational promises.

## Product Launch Intake

File: `schemas/product-launch-intake.schema.json`

Example: `examples/product-launch-intake.example.json`

Purpose: Capture feature, owner, launch date, customer segment, jurisdictions, data involved, AI features, public claims, customer commitments, privacy impact, contract impact, regulatory impact, and required approvals.

Reviewer use: Blocks launch where claims, privacy notices, AI Act transparency, DORA dependencies, or customer commitments still need evidence and approval.

## Approval Records

File: `examples/product-launch-approval-records.example.json`

Purpose: Demonstrate the human approval state consumed by decision packets.

Required fields:

1. `approval`: Approval label matching a required action-plan approval.
2. `state`: `approved`, `pending`, or `rejected`.
3. `reviewer`: Synthetic reviewer identity or role.
4. `note`: Short approval rationale.
5. `timestamp`: ISO timestamp for auditability.

Decision packets treat missing or rejected approvals as export blockers. The gate is a workflow control. It is not legal advice.
