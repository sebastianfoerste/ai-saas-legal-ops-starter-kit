# Project Roadmap: AI SaaS Legal Operations Platform

This document outlines the three planned development phases to evolve the starter kit into a complete enterprise-grade legal operations system.

---

## Phase 1: Core Starter Kit & Deterministic Validation (Current)
*Objective: Expose standard contracts and compliance policies as machine-readable code.*

*   **JSON Schemas**: Standardize fields for intakes, DPAs, vendor reviews, open-source dependencies, and product releases.
*   **Deterministic Validation Engine**: Build a local, typed compiler validating JSON files against their respective schema definitions using `Ajv`.
*   **Deterministic Risk scoring**: Write rules-based TypeScript calculations classifying matters (`low`, `medium`, `high`, `escalate`) without external LLM API dependencies.
*   **Self-Serve Markdown Templates**: Provide business-facing questionnaires mapped to schemas.
*   **CI/CD Automated Checks**: Set up GitHub Actions pipelines to validate files and run tests on code updates.

---

## Phase 2: Self-Serve Web UI (Next)
*Objective: Build an interactive, self-serve interface for business users.*

*   **Intake Form Generator**: Dynamically generate web forms based on the JSON schemas, providing inline validation and descriptions to business users.
*   **Risk Engine Dashboard**: Display real-time risk scores as users complete forms, prompting remediation suggestions immediately (e.g. suggesting model training opt-outs if unchecked).
*   **Playbook Integration**: Embed contract and policy playbooks into the UI, linking specific field warnings to policy explanations.
*   **Authentication & Access Control**: Connect to corporate identity providers (such as Google Workspaces or Okta) via OAuth to manage user groups (sales, product, engineering).

---

## Phase 3: Supervised Agent Layer & Audit Registry (Future)
*Objective: Integrate agentic AI models with human oversight and structured audit logs.*

*   **Agentic Analysis**: Integrate secure, private LLM agents to draft summaries, locate custom clauses in raw contract PDFs, and pre-triage missing facts.
*   **Human Reviewer Queue**: Build a reviewer queue dashboard for General Counsel (`sebastianfoerste`) and the legal team to view, comment on, and sign off on escalated matters.
*   **Immutable Audit Logs**: Log all validations, risk scores, reviewer approvals, and final decision memos into an auditable registry (using a secure database or vector store).
*   **Continuous Feedback Loop**: Auto-suggest revisions to schemas and risk-scoring coefficients based on historical human overrides and contract precedents.
