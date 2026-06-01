# Template: Open-Source Dependency Triage & License Review

## 1. Purpose
This template structures the evaluation of third-party open-source libraries to verify compliance with license terms and detect copyleft (reciprocal sharing) risks.

## 2. When to Use
Use this template before approving a new npm package, Python library, or other open-source dependency to be included in our SaaS codebase, SDKs, or distributed binaries.

## 3. Intake Questions (To be completed by Software Engineer)
*   **Package Name**: [e.g. super-vector-db-connector]
*   **License Type**: [e.g. MIT, Apache-2.0, GPL-3.0, AGPL-3.0]
*   **Use Case**: [What feature uses this package? e.g. Vector similarity calculation]
*   **Distribution Model**: [SaaS/Cloud Only / Client-Side SDK / Mobile App / Distributed Binary]

## 4. Review Questions (To be completed by Legal / Compliance)
*   **Modified or Unmodified**: [Did we change the open-source code? modified / unmodified]
*   **Linked or Separate Service**: [Is it linked or run as a separate service? linked / separate_service / unlinked]
*   **Attribution Needed**: [Does the license require showing copyright in product credits? Yes/No]
*   **Copyleft Concern**: [Does the license require open-sourcing our proprietary code? Yes/No]

## 5. Output
*   **License Approval Status**: [Approved / Rejected / Escalated]
*   **Engineering Instructions**: [e.g. Include LICENSE.txt in the build package / Dynamically link only]

## 6. Escalation Triggers
This package must be escalated to the General Counsel if:
*   The package uses a strong copyleft license (AGPL, GPL, SSPL, OSL) and is compiled into a distributed client-side SDK or mobile binary.
*   We modified the source code of a weak copyleft library (LGPL, MPL) and linked it statically to our core application.
*   The license type is custom, unknown, or not recognized by standard SPDX identifiers.

## 7. Playbook Update
*   *Approved licenses (e.g., MIT, Apache-2.0) are white-listed in the automated package linter. If a new copyleft compromise is reached, add exceptions to the build-pipeline scripts.*
