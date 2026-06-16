# Roadmap

This repository is a public-safe starter kit. The near-term roadmap keeps the scope narrow and focused on review-gated legal operations for AI SaaS.

## 1. Persistence

Add a durable local or database-backed matter store for validated intake payloads, risk decisions, approval records, transition history, and decision-packet manifests.

Success condition: a reviewer can reopen a synthetic matter, see the same deterministic risk decision, and inspect the audit trail that led to approval or rejection.

## 2. Reviewer Roles

Add explicit reviewer roles for General Counsel, privacy, security, product, finance, and regulatory counsel.

Success condition: approvals are role-scoped, rejected approvals block export, and every approved output records reviewer identity, timestamp, and reason.

## 3. Slack or Teams Integration

Add a dry-run connector that creates reviewer queue notifications for Slack or Microsoft Teams.

Success condition: delivery is disabled by default, messages include source provenance and approval state, and no external notification can be sent without explicit configuration.

## Non-Goals

1. No automated legal advice.
2. No customer, client, privileged, confidential, or personal data.
3. No external sending by default.
4. No replacement for qualified legal review.
