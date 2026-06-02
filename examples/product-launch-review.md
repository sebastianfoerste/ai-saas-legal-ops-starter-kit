# Product launch review example

Synthetic example for a product-counsel launch gate at an AI SaaS company.

## Launch area

AI assistant feature.

## Review status

Review required before external launch.

## Required reviewers

- Product counsel
- Privacy
- Security

## Review checks

| Check | Status | Reviewer question |
| --- | --- | --- |
| Customer data boundary | Pending review | What user or customer content is processed, stored or reused? |
| Provider terms | Pending review | Which model or infrastructure provider terms apply? |
| Customer commitments | Pending review | Do existing customer contracts require notice, approval or restrictions? |
| Auditability | Pending review | Are consequential actions logged with reviewer identity and decision state? |
| Human approval | Pending review | Has a qualified reviewer approved the launch position with a review note? |

## Launch gate

External launch remains blocked until the required reviewers have recorded their decisions.

## Intended signal

This example shows the operating layer a first GC should build: structured launch intake, mapped legal checks, reviewer ownership and an explicit approval gate.
