# Launch Readiness Checklist

This checklist tracks the requirements for deploying the AI SaaS Legal Ops Starter Kit to production or a public portfolio showcase.

- [ ] **Schemas Validate**
  - All JSON schemas in `schemas/` comply with draft-07 JSON Schema specifications.
- [ ] **Examples Validate**
  - All synthetic JSON examples in `examples/` pass AJV validation against their respective schemas.
- [ ] **Tests Pass**
  - All TypeScript unit tests in `tests/` pass with zero failures.
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
