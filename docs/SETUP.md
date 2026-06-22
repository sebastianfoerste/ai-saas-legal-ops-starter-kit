# Setup: AI SaaS Legal Ops Starter Kit

## Prerequisites

1. Node.js 20 or newer.
2. npm.

## Core Package

Install dependencies:

```bash
npm install
```

Run the core demo:

```bash
npm run build
npm run demo
```

Run the JSON demo:

```bash
npm run demo:json
```

## Dashboard

Install dashboard dependencies when the local cockpit is needed:

```bash
npm --prefix dashboard install
npm run dashboard:dev
```

Open `http://localhost:3000` and use the synthetic demo seed action.

## Data Boundary

Use bundled synthetic examples only unless Sebastian explicitly approves another local dataset. Do not add client, candidate, account, privileged or confidential data.
