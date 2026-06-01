# Template: Product Launch Legal & Regulatory Intake

## 1. Purpose
This template triages new features and product capability releases to identify privacy impacts, regulatory concerns (e.g. EU AI Act), and marketing claim exposure.

## 2. When to Use
Use this template at least 30 days prior to any planned public launch or beta release of a major feature, new system, or AI capabilities.

## 3. Intake Questions (To be completed by Product Manager)
*   **Feature Name**: [e.g. AutoDraft Agent v2]
*   **Owner**: [Lead Product Manager]
*   **Target Launch Date**: [YYYY-MM-DD]
*   **Customer Segment**: [Enterprise / SMB / B2C / Regulated Sectors]
*   **Jurisdictions**: [Where will this be available? e.g. US, EU, UK]
*   **Data Categories Processed**: [e.g. prompt histories, personal identifiers, system metadata]
*   **AI Models / LLMs Used**: [e.g. Gemini 1.5 Pro, local LLM API]

## 4. Review Questions (To be completed by Product Counsel / DPO)
*   **Public Marketing Claims**: [Are we claiming specific accuracy rates or zero hallucinations? List them]
*   **Customer Commitments Affected**: [Does this feature violate any customer data residency or security agreements?]
*   **Privacy Impact**: [Does this require a DPIA, cookie consent update, or updated privacy policy?]
*   **Contractual Impact**: [Do we need to update standard terms or terms of service?]
*   **Regulatory Impact**: [Does this trigger classification under EU AI Act, MiCAR, DORA, CCPA, or HIPAA?]

## 5. Output
*   **Triage Risk Score**: [Low / Medium / High / Escalate]
*   **Required Approvals**: [DPO / CISO / VP Product / General Counsel]
*   **Engineering Instructions**: [e.g. Configure model opt-out toggle / Add cookie consent banner]

## 6. Escalation Triggers
This launch must be escalated to the General Counsel and executive team if:
*   The feature uses customer data to run fine-tuning checks or model training without explicit consent.
*   The feature is classified as "High-Risk" under the EU AI Act (e.g., biometric sorting, credit scoring, employment decisions).
*   Marketing intends to claim performance levels (e.g., '100% error-free') that cannot be verified deterministically.

## 7. Playbook Update
*   *Add new features to the Product Taxonomy and document standard compliance checks (e.g., EU AI Act classification flow chart) to speed up future launches.*
