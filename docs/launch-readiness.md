# Launch Readiness Checklist

This checklist tracks the requirements for deploying the AI SaaS Legal Ops Starter Kit to production or a public portfolio showcase.

- [ ] **Schemas Validate**
  - All JSON schemas in `schemas/` comply with draft-07 JSON Schema specifications.
- [ ] **Examples Validate**
  - All synthetic JSON examples in `examples/` pass AJV validation against their respective schemas.
- [ ] **Tests Pass**
  - All TypeScript unit tests in `tests/` pass with zero failures.
- [ ] **Portfolio Reporting Works**
  - Action plan and risk register tests produce deterministic approvals, blockers, overdue matters, and recommended actions.
- [ ] **Contract Playbook Works**
  - Contract playbook tests produce deterministic fallback positions, non-starters, approvals, and reviewer notes.
- [ ] **Evidence Pack Readiness Works**
  - Evidence-pack tests produce deterministic JSON and Markdown for product launch, AI vendor, and DPA matters.
- [ ] **Regulatory Matrix Works**
  - Matrix tests produce expected AI Act, GDPR, DORA, Data Act, CRA, OWASP GenAI, and internal-policy rows with owners, readiness states, and evidence requirements.
- [ ] **Decision Packet Export Works**
  - Decision packet tests include source payload, validation, risk, action plan, evidence pack, regulatory matrix, playbook deviations where applicable, transition history, and SHA-256 manifest.
- [ ] **Demo CLI Works**
  - `npm run demo` and `npm run demo:json` produce end-to-end reports from bundled public-safe examples.
- [ ] **Policy Health Visible**
  - `legal-ops-demo policy-health`, dashboard analysis responses, and dashboard health strip expose valid, missing, invalid JSON, invalid shape, unsupported operator, and unresolved path states.
- [ ] **Package Publishability Works**
  - `npm run check:package` builds, imports `dist/src/index.js`, verifies root exports and CLI bin path, and runs `npm pack --dry-run` against the files whitelist.
- [ ] **Supply-Chain Gates Run**
  - CI runs root `npm audit --omit=dev` and dashboard production audit. The current dashboard Next/PostCSS advisory (`GHSA-qx2v-qp2m-jg93`) is a documented temporary exception only. Do not use `npm audit fix --force`.
- [ ] **No Secrets**
  - No api keys, passwords, private SSH keys, or cloud credentials exist in the codebase.
- [ ] **No Client Data**
  - No client names, personal identifying information, or privileged communication is included.
- [ ] **README Explains Limitations**
  - README clearly outlines that the tools are not legal advice.
- [ ] **Human Review Rule Visible**
  - The Human-in-the-Loop policy and disclaimer are prominently featured in the README and policies.
- [ ] **License Exists**
  - MIT License exists in the root directory.
- [ ] **Demo Script Works**
  - The five-minute demo walkthrough is verified and executable.
