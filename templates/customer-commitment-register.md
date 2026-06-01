# Template: Customer Commitment & SLA Register Intake

## 1. Purpose
This template captures and tracks custom commitments (e.g. data residency, audit commitments, custom SLAs) to ensure operational compliance and prevent breaches.

## 2. When to Use
Use this template immediately after signing a contract containing non-standard customer commitments, or during negotiations to register operational requirements.

## 3. Intake Questions (To be completed by Business Sponsor / Deal Owner)
*   **Customer Name**: [Legal Entity Name]
*   **Commitment Details**: [Describe exactly what we promised, e.g. 'All support calls answered in 1 hour']
*   **Source Document**: [MSA Exhibit A, Section 3.1 / Custom DPA Rider]
*   **Owner**: [Lead engineering/ops contact responsible for delivery]

## 4. Review Questions (To be completed by Product Counsel / Ops Reviewer)
*   **Product Area Affected**: [e.g. Storage, Customer Support, Auth, Vector Database]
*   **Operational Dependency**: [What technical settings or work is needed? e.g. Setup custom alerting]
*   **Renewal Relevance**: [Will breach of this commitment block contract renewal? Yes/No]
*   **Review Date**: [YYYY-MM-DD]
*   **Current Status**: [active / pending / overdue / at_risk / completed]

## 5. Output
*   **Fulfillment Tracking Action**: [Configure alerting / Schedule audit / Deploy region]
*   **Required Compliance Action**: [Specific remediation step if status is at_risk or overdue]

## 6. Escalation Triggers
This commitment must be escalated to the General Counsel and VP of Product if:
*   The commitment status changes to `at_risk` or `overdue` within 30 days of a major contract renewal.
*   The commitment requires a technical architecture change that violates our standard system design (e.g., dedicated database cluster).
*   The SLA penalties include material refunds or automatic termination rights.

## 7. Playbook Update
*   *If a technical commitment is successfully automated (e.g., automatic region-routing), document the architectural standard in the engineering playbook and update DPA intake logic.*
