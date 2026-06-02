# Board risk memo example

This synthetic example shows the intended output format for a first-GC legal operations workflow at an AI SaaS company.

## Executive summary

The legal function has reviewed the current intake queue across contracts, data protection, vendor review and product launch governance. No item is treated as approved unless a reviewer decision and review note are recorded.

## Current risk view

| Area | Status | Review owner | Decision state |
| --- | --- | --- | --- |
| Enterprise contracts | Active intake | Legal | Review required |
| DPA deviations | Active intake | Privacy/legal | Review required |
| AI vendor review | Initial screening | Legal/security | Pending evidence |
| Product launch checks | Intake complete | Product counsel | Not yet approved |

## Escalation items

1. Customer commitments that change standard data-use, audit, security or service-level language.
2. Product features that require a new privacy, AI governance or open-source review.
3. Vendor terms that create unclear data-use, training, confidentiality or subprocessors obligations.

## Controls used

- Typed intake for each legal workstream.
- Deterministic risk scoring before any generated summary.
- Reviewer routing based on risk and business area.
- Human decision and review note before approval.
- Export only from approved records.

## Intended use

This memo is not legal advice. It is a board-facing operating snapshot that shows decision state, escalation logic and review discipline.
