# Case study — ai-saas-legal-ops-starter-kit

> The recurring legal work of an AI SaaS business should run on templates, triage, and gates — not ad-hoc email. Synthetic data only; not legal advice.

## Problem
A fast-growing AI SaaS company generates the same legal work every week: contract intake, DPA and sub-processor review, AI-vendor approval, launch governance. Done ad hoc, it is inconsistent, slow, and invisible to leadership — and it does not scale with headcount. The need is an operating layer, not more one-off advice.

## Users
A first legal hire, GC, or legal ops lead standing up the function — and the Sales, Product, and Security teams who need fast, consistent legal answers.

## Workflow
1. **Intake** — commercial contracts, DPAs, vendor and AI-tool requests captured as structured items.
2. **Triage** — each routed and risk-scored against a playbook (DPA triage, vendor review, AI Act transparency, commercial review).
3. **Launch governance** — a release is gated on the open legal items it depends on.
4. **Reporting** — an approval-gated risk report and a launch decision (e.g. **HOLD** on open items).
5. **Self-serve assets** — templates and playbooks the business can use without a lawyer in every thread.

## Controls
Launch is gated: open high-risk items hold the release. Everything routes to a named owner with an approval tier. The companion `legal-function-operating-system` provides the routing/SLA/approval/board-pack engine underneath; `dpa-and-data-transfer-review` provides the cited DPA checks.

## Evaluation
The bundled launch report (`examples/launch-governance-report.md`) takes a synthetic "Agents GA" release and returns **HOLD** on two gated items — a US sub-processor without a transfer mechanism and a missing AI Act transparency notice — each routed and remediated.

## Limitations
Templates and playbooks are illustrative starting points, not firm-specific precedent; the kit models the operating layer over synthetic inputs and is not integrated with a real CLM or ticketing system.

## Next steps
Wire intake to a real request channel (Slack/Jira); connect the DPA checks to `dpa-and-data-transfer-review`; add the `legal-function-operating-system` board pack as the leadership view; tune playbooks to a specific company's risk posture.
