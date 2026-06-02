# What This Proves for a General Counsel Candidate

This repository serves as a concrete proof of work demonstrating the legal engineering and legal operations capabilities required of a first General Counsel at an AI-native SaaS company.

## 1. Legal Workflows as Structured Internal Product Infrastructure
Traditional legal teams operate reactively via email inboxes. This repository demonstrates the ability to translate recurring legal tasks into structured, scalable workflows:
- **Typed Workflows and Schemas**: SaaS contract intake, DPA triage, AI vendor reviews, open-source compliance, customer commitments, and product launches are defined as strict TypeScript schemas.
- **Deterministic Validation & Triage**: Every request is validated against its schema (using JSON Schema/Ajv) and triaged programmatically through rules (such as custom data retention, GDPR special category data, copyleft licenses). This makes routine intake self-serve and routes high-stakes issues directly to the GC.
- **Auditable Evidence and Action Plans**: Escalated matters automatically generate Action Plans detailing required approvals, blockers, and evidence to collect.

## 2. Technical Alignment with Core Engineering and Product
A General Counsel in an AI-native company must speak the same language as the engineering and product teams:
- **Engineering Legibility**: Instead of static Word playbooks, the legal playbook is codified as testable logic. This allows engineering, product, security, and legal to inspect rules and routing together.
- **Robust Software Hygiene**: Zero-dependency runtime, type safety, Vitest unit test suites, and GitHub Actions CI pipelines demonstrate that legal tools can be held to the same operational standards as production software.

## 3. Practical AI Governance and Risk Mitigation
For a platform running agents on customer data, this prototype implements real-world governance boundaries:
- **AI Model Contamination Prevention**: Automatically flags and blocks vendors that train base models on prompt inputs.
- **Data Boundary Compliance**: Tracks and alerts on regional residency and cloud infrastructure commitments (e.g. EU data boundaries).
- **Proactive Product Counsel**: Maps incoming product launches to compliance frameworks (GDPR, EU AI Act, NIST AI RMF, ISO/IEC 42001) to identify missing design requirements (e.g., human-in-the-loop oversight override paths) before code goes to production.
- **No "Vibe Coding"**: Evals and deterministic rule checks are prioritized over probabilistic LLM prompts to ensure legal compliance remains absolute and auditable.
