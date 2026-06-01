# Template: Data Processing Agreement (DPA) Triage

## 1. Purpose
This template provides a standard, repeatable process for assessing customer privacy annexes, identifying cross-border data transfer risks, and evaluating special category data exposures.

## 2. When to Use
Use this template when a customer submits a markup of our Data Processing Addendum, or when reviewing a third-party vendor's DPA before processing any personal data.

## 3. Intake Questions (To be completed by Business Sponsor)
*   **Product or Service**: [SaaS Name, e.g. StrategyOS Content Suite]
*   **Our Role**: [Controller / Processor / Joint Controller]
*   **Data Subjects**: [e.g. employees, customers, end-users, website visitors]
*   **Personal Data Categories**: [e.g. name, email, IP address, user usage logs, chat prompts]
*   **Special Category Data**: [Identify any health, biometric, genetic, political, or union data]

## 4. Review Questions (To be completed by Privacy / Product Counsel)
*   **Subprocessors Listed**: [List names, locations, and purposes]
*   **Transfer Locations**: [Where is the data hosted or accessed from? e.g. US, EU, Germany]
*   **Retention Period**: [How long is data kept? e.g. Term + 30 days]
*   **Deletion Process**: [Is there a certified deletion timeline on termination? e.g. 30 days, 90 days]
*   **Security Annex Status**: [Are standard TOMs used or is there a custom security requirement?]
*   **Customer Requested Changes**: [Summarize customer edits, e.g. physical inspections, immediate breach notifications]

## 5. Output
*   **Privacy Risk Classification**: [Low / Medium / High / Escalate]
*   **Privacy Actions Required**: [Standard DPA signature / Standard SCCs implementation / Custom TOMs alignment]
*   **Missing Facts**: [List any missing details, e.g. subprocessor security certifications]

## 6. Escalation Triggers
This DPA must be escalated to the DPO or General Counsel if:
*   Special category data (health, biometrics) is processed without a dedicated Data Protection Impact Assessment (DPIA).
*   The customer requires deletion periods shorter than our technical deletion SLA (30 days).
*   The customer demands unrestricted physical access to AWS data centers for audits.

## 7. Playbook Update
*   *If custom deletion or physical audit terms are approved by the GC, log this in the Customer Commitment Register and notify the Infrastructure engineering team to update system configurations.*
