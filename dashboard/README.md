# AI SaaS Legal Portal Dashboard

This Next.js dashboard is the visual review surface for the AI SaaS Legal Ops Starter Kit. It turns the deterministic TypeScript core into a self-serve legal portal with:

- synthetic Dust-style intake matters,
- a matter queue with status, risk, evidence readiness and review gate,
- live intake analysis from structured JSON payloads,
- evidence-pack and contract-playbook review tabs,
- audit history for each matter,
- General Counsel-only approval and rejection gates.

## Run Locally

From the repository root:

```bash
npm install
npm --prefix dashboard install
npm run dashboard:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate

```bash
npm run dashboard:lint
npm run dashboard:build
```

The root dashboard scripts compile the starter kit core first, then run the Next.js dashboard. A fresh clone does not need committed `dist/` artifacts.
