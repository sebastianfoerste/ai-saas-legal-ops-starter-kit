# Template: SaaS Contract Intake Review

## 1. Purpose
This template structures the initial intake and triage of incoming software subscription agreements, customer MSA markups, and standard vendor contracts to flag high-risk terms early.

## 2. When to Use
Use this template whenever a customer requests changes to our standard SaaS Master Subscription Agreement (MSA), or when a new enterprise vendor presents their custom commercial terms for signature.

## 3. Intake Questions (To be completed by Business Sponsor)
*   **Request Owner**: [Name / Email / Role]
*   **Customer / Vendor Name**: [Legal Entity Name]
*   **Contract Type**: [MSA / DPA / Addendum / NDA / custom]
*   **Deal Stage**: [Lead / Proposal / Negotiation / Legal Review]
*   **Requested Deadline**: [YYYY-MM-DD]
*   **Customer Sector**: [e.g. Healthcare, Finance, Fintech, Retail, Tech]
*   **Regulated Customer?**: [Yes / No] (If yes, specify regulatory framework like HIPAA, DORA, BaFin)
*   **Deployment Model**: [Multi-Tenant SaaS / Single-Tenant Dedicated / On-Premise]
*   **What data categories will we process for them?**: [e.g. usernames, emails, medical logs, credit cards]
*   **Are AI features involved?**: [Yes / No] (If yes, list the specific features, e.g. Co-Pilot, automated summaries)

## 4. Review Questions (To be completed by Product Counsel / Reviewer)
*   **Underlying Model Vendors**: [e.g. Google Gemini, OpenAI APIs]
*   **Non-Standard Terms Detected**: [List terms, e.g. custom IP ownership, uncapped liability]
*   **Red Flags Identified**: [List red flags, e.g. customer data used for base model training]
*   **Business Position**: [Commercial justification for accepting non-standard terms, e.g. $500k ARR target]
*   **Specific Legal Question**: [The exact question for the General Counsel]

## 5. Output
*   **Initial Triage Risk Score**: [Low / Medium / High / Escalate]
*   **Next Action**: [Approve standard / Send to GC for escalation / Request missing facts]
*   **Approved with Conditions**: [List conditions, e.g. 'Must enable model training opt-out']

## 6. Escalation Triggers
This matter must be escalated to the General Counsel immediately if:
*   The customer is in a highly regulated sector (Finance/Healthcare) and demands custom audit rights.
*   The agreement permits the vendor or any subprocessor to train models on customer inputs.
*   The liability cap for data breaches is requested to exceed 2x Annual Contract Value (ACV).

## 7. Playbook Update
*   *If this escalation results in a negotiated compromise (e.g. agreeing to 3x ACV cap for DORA compliance), document the compromise in the Contract Playbook and update the automated risk-scoring rules accordingly.*
