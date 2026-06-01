# Contributing to the AI SaaS Legal Ops Starter Kit

Thank you for contributing to this legal engineering portfolio. To maintain the project's integrity, security, and public accessibility, all contributors must follow these strict guidelines.

---

## 1. Absolute Data Safety Boundaries

> [!CAUTION]
> **Never commit real-world client data, personal identifiers, confidential commercial terms, or privileged legal communication to this repository.**

All contributions (schemas, examples, templates, tests, or documentation) must use **strictly synthetic, public-safe, and fabricated information**.
*   **Names**: Use fictional companies (e.g. Acme Health Systems, Apex Finance Corp) and fictional characters (e.g. Alice Chen).
*   **Commercial Terms**: Use illustrative numbers and mock terms. Do not paste real transaction details or pricing packages.
*   **Legal Advice**: Do not commit actual, active legal advice or legal opinions provided to clients or employers.

---

## 2. Test Discipline & Deterministic Design

*   All code changes to the risk engine or validation logic must include corresponding unit tests in the `tests/` folder.
*   **No LLM Calls in Core Logic**: The risk-scoring engine (`src/risk-scoring.ts`) and validation compiler (`src/validate.ts`) must run entirely locally and deterministically. Do not integrate external AI APIs in standard triage steps, ensuring 100% predictability and auditability.
*   Ensure that all tests pass cleanly under the local runner before submitting a Pull Request:
    ```bash
    npm run test
    npm run typecheck
    npm run validate:examples
    ```

---

## 3. Human Review Framing

*   Any new templates, workflows, or documentation must clearly frame automated results as triage tools rather than final legal advice.
*   All legal workflows must incorporate explicit human review gates (as defined in `policies/human-review-policy.md`). Never present this starter kit or any derived tools as a substitute for qualified legal counsel.

---

## 4. Code Standards & Architecture

*   **TypeScript**: Write typed code. Avoid implicit `any` annotations. Avoid wildcard dependencies.
*   **Imports**: Under `NodeNext` resolution rules, specify relative imports using the `.js` extension (e.g. `import { foo } from './bar.js'`).
*   **Lint & Validation**: Verify that any new schema files validate correctly.
