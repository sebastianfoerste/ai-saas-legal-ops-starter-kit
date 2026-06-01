# Policy: Automated Escalation Rules & Risk Thresholds

## 1. Objective
This policy defines the deterministic rules and thresholds used to route legal, privacy, and regulatory matters from automated triage pipelines to the General Counsel.

## 2. Scope
This policy applies to all automated contract intakes, data processing agreements (DPAs), vendor security assessments, open-source dependency audits, and pre-launch product reviews.

## 3. Core Escalation Rules
A matter must be marked as `escalate` and routed to the General Counsel when it meets any of the following criteria:

### A. Regulated Customers
*   Any customer operating in a regulated sector (e.g. Healthcare, Banking, Finance, Fintech) where our software processes data that could trigger compliance audits or audits under DORA, HIPAA, BaFin, or SEC.

### B. Sensitive & High-Risk Data
*   Processing of GDPR Art. 9 Special Categories of Data (e.g. biometrics, health records, genetic data).
*   Handling of high-risk identifiers such as credit cards (PCI-DSS), Social Security Numbers (SSNs), credentials, or cryptographic keys.

### C. Non-Standard Retention Terms
*   Contracts requiring indefinite data retention, or data deletion SLAs shorter than 30 days.

### D. AI Vendor & Data Training Risks
*   Any vendor tool or API agreement that enables the provider to train their base or public models on our or our customers' input prompts or completion data.

### E. Unclear Subprocessors
*   Use of subprocessors in jurisdictions without an EU adequacy decision, or where the vendor fails to list subprocessors.

### F. Open-Source Reciprocal Sharing (Copyleft)
*   Incorporation of strong copyleft licenses (e.g. AGPL-3.0, GPL-3.0, SSPL) inside client-facing SDKs or distributed binaries.

### G. Unvetted Public Claims
*   Marketing or product claims asserting accuracy benchmarks (e.g. '99.8% accurate') or liability guarantees ('100% hallucination-free') without deterministic audit logs.

### H. Material Customer Commitments
*   Custom service SLA commitments or operational requirements that are marked as `at_risk` or `overdue`.

### I. Executive Risk
*   Any item flagged by leadership as containing board-level or material regulatory exposure.

## 4. Remediation and Exception Logs
When an escalation occurs, the reviewer must complete an Escalation Note. If the GC approves an exception, it must be logged in the risk registry and the playbook updated.
