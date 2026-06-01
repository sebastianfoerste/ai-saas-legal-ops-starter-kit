# Template: AI Vendor Governance & Tool Review

## 1. Purpose
This template outlines the risk review and safety assessment of external AI vendors and third-party model providers to prevent data leaks and ensure regulatory compliance.

## 2. When to Use
Use this template before approving any new third-party AI tool, API integration, or external model provider (e.g. OpenAI, Anthropic, Midjourney) for use by employees or within product features.

## 3. Intake Questions (To be completed by Business Sponsor)
*   **Vendor Name**: [e.g. Synthetix AI Inc.]
*   **Tool / Service**: [e.g. TranslateMaster Pro API]
*   **Use Case**: [Detailed business description of what the tool will do]
*   **Business Owner**: [Sponsoring team lead / VP]
*   **Data Entered**: [What categories of data will be inputted into the tool? e.g. source code, customer support chats]

## 4. Review Questions (To be completed by Product Counsel / Security)
*   **Output Use**: [How are outputs used? e.g. internal review, user-facing, automated decisions]
*   **Data Retention Position**: [How long does the vendor retain prompt/completion data? e.g. zero retention, 30 days]
*   **Training on Customer Data**: [Does the vendor use input data to train public or base models? Yes/No]
*   **Subprocessors Used**: [Are there downstream hosting or model providers? e.g. Azure, AWS]
*   **Security Material Reviewed**: [e.g. SOC 2 Type II, ISO 27001, Pen Test]

## 5. Output
*   **Vendor Approval Status**: [Approved / Rejected / Pending / Escalated]
*   **Permitted Use Cases**: [Explicit list of approved uses]
*   **Prohibited Use Cases**: [Banned data categories, e.g. NO production code, NO customer PII]
*   **Compliance Conditions**: [e.g. Must toggle 'Opt-Out of Model Training' switch in settings]

## 6. Escalation Triggers
This AI vendor must be escalated to the General Counsel and CISO if:
*   The vendor's default terms allow training of models on our or our customers' submitted data.
*   The vendor lacks standard security credentials (e.g., no SOC 2 or equivalent third-party audit).
*   The tool processes customer personal data without an EU-compliant DPA and Standard Contractual Clauses.

## 7. Playbook Update
*   *Approved tools must be added to the internal Approved AI Tools Registry with their specific conditions. Update security filters to auto-alert when unapproved AI vendor endpoints are detected in source code.*
