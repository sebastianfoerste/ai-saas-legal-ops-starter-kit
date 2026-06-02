import { calculateRisk, type RiskAssessment, type RiskLevel } from './risk-scoring.js';

export type ReviewGate = 'self-serve' | 'legal-review' | 'senior-legal-review' | 'gc-review';
export type ActionPriority = 'routine' | 'watch' | 'urgent' | 'blocked';

export type LegalMatterData = Record<string, unknown>;

export interface LegalActionPlanOptions {
  risk?: RiskAssessment;
}

export interface LegalActionPlan {
  schemaType: string;
  risk: RiskAssessment;
  reviewGate: ReviewGate;
  priority: ActionPriority;
  summary: string;
  nextAction: string;
  requiredApprovals: string[];
  blockers: string[];
  followUps: string[];
  evidenceToCollect: string[];
  auditTrail: string[];
}

interface ActionProfile {
  approvals: string[];
  followUps: string[];
  evidence: string[];
}

const LEVEL_ORDER: RiskLevel[] = ['low', 'medium', 'high', 'escalate'];

const LEVEL_PROFILE: Record<RiskLevel, Pick<LegalActionPlan, 'reviewGate' | 'priority' | 'summary' | 'nextAction'>> = {
  low: {
    reviewGate: 'self-serve',
    priority: 'routine',
    summary: 'No material legal trigger was identified by the deterministic rule set.',
    nextAction: 'Proceed through the self-serve playbook and record the completed intake.'
  },
  medium: {
    reviewGate: 'legal-review',
    priority: 'watch',
    summary: 'The matter contains non-standard points that need legal review before operational approval.',
    nextAction: 'Assign to a legal reviewer for targeted checks against the flagged terms.'
  },
  high: {
    reviewGate: 'senior-legal-review',
    priority: 'urgent',
    summary: 'The matter contains high-risk deviations requiring senior legal sign-off before approval.',
    nextAction: 'Hold approval until senior legal review confirms the remediation path and approval owner.'
  },
  escalate: {
    reviewGate: 'gc-review',
    priority: 'blocked',
    summary: 'The matter triggered an escalation rule and is blocked pending GC or delegated accountable owner review.',
    nextAction: 'Route to the GC review queue with source payload, triggered reasons, and proposed remediation.'
  }
};

const TYPE_PROFILES: Record<string, ActionProfile> = {
  saascontractintake: {
    approvals: ['Commercial Owner Approval'],
    followUps: [
      'Confirm the deal owner accepts any approved non-standard term.',
      'Update the contract playbook if a recurring fallback position is approved.'
    ],
    evidence: ['Signed order form or MSA draft with non-standard terms highlighted.']
  },
  dpatriage: {
    approvals: ['DPO Sign-off'],
    followUps: [
      'Attach the current subprocessor list and technical and organisational measures.',
      'Confirm the deletion process and retention period against the DPA position.'
    ],
    evidence: ['DPA draft, subprocessor list, transfer map, and security annex.']
  },
  aivendorreview: {
    approvals: ['Security Review', 'Privacy Review'],
    followUps: [
      'Confirm prompt, completion, and log retention positions before vendor use.',
      'Record approved use cases and prohibited use cases in the AI vendor register.'
    ],
    evidence: ['Vendor DPA, AI terms, security documentation, and model training position.']
  },
  opensourcereview: {
    approvals: ['Open-Source Legal Review', 'Engineering Owner Approval'],
    followUps: [
      'Document the distribution model and linking pattern.',
      'Record attribution and notice obligations before release.'
    ],
    evidence: ['Licence text, package metadata, dependency path, and distribution model.']
  },
  customercommitment: {
    approvals: ['Customer Success Owner Approval'],
    followUps: [
      'Update the commitment register owner, status, and next review date.',
      'Notify product and security owners of any operational dependency.'
    ],
    evidence: ['Source contract clause, owner assignment, and current implementation status.']
  },
  productlaunchintake: {
    approvals: ['Product Owner Approval'],
    followUps: [
      'Map every public launch claim to supporting evidence before publication.',
      'Confirm whether customer commitments or privacy notices need updating.'
    ],
    evidence: ['Launch brief, privacy review, claims evidence pack, and release checklist.']
  }
};

export function createLegalActionPlan(
  schemaType: string,
  data: LegalMatterData,
  options: LegalActionPlanOptions = {}
): LegalActionPlan {
  const risk = options.risk ?? calculateRisk(schemaType, data);
  const profile = LEVEL_PROFILE[risk.level];
  const typeKey = normalizeType(schemaType);
  const typeProfile = TYPE_PROFILES[typeKey] ?? {
    approvals: [],
    followUps: ['Record the triage decision and accountable owner.'],
    evidence: ['Validated intake payload and supporting business context.']
  };

  const requiredApprovals = uniqueStrings([
    ...toStringArray(data.requiredApprovals),
    ...typeProfile.approvals,
    ...inferApprovals(typeKey, risk, data)
  ]);

  const blockers = buildBlockers(risk);
  const followUps = uniqueStrings([
    ...typeProfile.followUps,
    ...inferFollowUps(risk, data),
    'Record decision, reviewer, date, and rationale in the legal risk register.'
  ]);
  const evidenceToCollect = uniqueStrings([
    ...typeProfile.evidence,
    ...inferEvidence(risk, data),
    'Validated source payload and triggered rule reasons.'
  ]);

  return {
    schemaType,
    risk,
    reviewGate: profile.reviewGate,
    priority: profile.priority,
    summary: profile.summary,
    nextAction: profile.nextAction,
    requiredApprovals,
    blockers,
    followUps,
    evidenceToCollect,
    auditTrail: [
      `Schema type: ${schemaType}`,
      `Risk level: ${risk.level}`,
      `Review gate: ${profile.reviewGate}`,
      'Automated output is triage support only. Human review is required for consequential legal decisions.'
    ]
  };
}

function normalizeType(schemaType: string): string {
  return schemaType.toLowerCase().replace(/[^a-z]/g, '');
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function inferApprovals(typeKey: string, risk: RiskAssessment, data: LegalMatterData): string[] {
  const approvals: string[] = [];

  if (isAtLeast(risk.level, 'high')) {
    approvals.push('Senior Legal Review');
  }
  if (risk.level === 'escalate') {
    approvals.push('GC Approval');
  }
  if (typeKey.includes('dpa') || hasReason(risk, ['special category', 'sensitive', 'subprocessor', 'retention', 'deletion'])) {
    approvals.push('DPO Sign-off');
  }
  if (typeKey.includes('vendor') || hasReason(risk, ['ai vendor', 'model training', 'fine-tuning', 'training', 'trains'])) {
    approvals.push('Security Review', 'Privacy Review');
  }
  if (typeKey.includes('productlaunch') && mentionsRegulatedSegment(data)) {
    approvals.push('Regulatory Counsel Review');
  }

  return approvals;
}

function buildBlockers(risk: RiskAssessment): string[] {
  if (!isAtLeast(risk.level, 'high')) {
    return [];
  }

  return risk.reasons
    .filter(reason => reason !== 'No escalation or high-risk rules matched.')
    .map(reason => `Resolve before approval: ${reason}`);
}

function inferFollowUps(risk: RiskAssessment, data: LegalMatterData): string[] {
  const followUps: string[] = [];

  if (hasReason(risk, ['public claims'])) {
    followUps.push('Request evidence for each public claim and hold publication until claims review is complete.');
  }
  if (hasReason(risk, ['special category', 'sensitive or high-risk data'])) {
    followUps.push('Confirm whether a DPIA, transfer assessment, or customer notice update is required.');
  }
  if (hasReason(risk, ['training', 'fine-tuning', 'trains'])) {
    followUps.push('Obtain contractual evidence that customer inputs are excluded from provider model training.');
  }
  if (hasReason(risk, ['subprocessor', 'hosting regions'])) {
    followUps.push('Validate subprocessors, hosting regions, transfer mechanism, and objection process.');
  }
  if (hasReason(risk, ['retention', 'deletion'])) {
    followUps.push('Align retention and deletion wording with the approved DPA and security baseline.');
  }
  if (hasReason(risk, ['copyleft', 'license', 'licence'])) {
    followUps.push('Confirm whether the package is distributed, linked, modified, or used as a separate service.');
  }
  if (hasReason(risk, ['regulated customer', 'regulated customer segments', 'regulatory impact'])) {
    followUps.push('Confirm applicable regulated-sector commitments before customer or launch approval.');
  }
  if (toStringArray(data.customerCommitmentsAffected).length > 0) {
    followUps.push('Notify every owner of an affected customer-specific commitment.');
  }

  return followUps;
}

function inferEvidence(risk: RiskAssessment, data: LegalMatterData): string[] {
  const evidence: string[] = [];

  if (hasReason(risk, ['public claims'])) {
    evidence.push('Claims substantiation file with test method, sample, owner, and approval record.');
  }
  if (hasReason(risk, ['training', 'fine-tuning', 'trains'])) {
    evidence.push('Vendor terms proving customer inputs are excluded from base-model training.');
  }
  if (hasReason(risk, ['subprocessor', 'hosting regions'])) {
    evidence.push('Subprocessor register, hosting-region map, and transfer mechanism evidence.');
  }
  if (hasReason(risk, ['special category', 'sensitive or high-risk data'])) {
    evidence.push('Data category map, DPIA decision, and privacy notice impact analysis.');
  }
  if (hasReason(risk, ['copyleft', 'license', 'licence'])) {
    evidence.push('Licence compatibility analysis and engineering architecture note.');
  }
  if (toStringArray(data.customerCommitmentsAffected).length > 0) {
    evidence.push('Affected customer commitment register entries and owner confirmations.');
  }

  return evidence;
}

function hasReason(risk: RiskAssessment, keywords: string[]): boolean {
  return risk.reasons.some(reason => {
    const normalized = reason.toLowerCase();
    return keywords.some(keyword => normalized.includes(keyword));
  });
}

function mentionsRegulatedSegment(data: LegalMatterData): boolean {
  const customerSegment = typeof data.customerSegment === 'string' ? data.customerSegment.toLowerCase() : '';
  const jurisdictions = toStringArray(data.jurisdictions).map(item => item.toLowerCase());
  return customerSegment.includes('regulated') || jurisdictions.includes('eu') || jurisdictions.includes('uk');
}

function isAtLeast(level: RiskLevel, minimum: RiskLevel): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(minimum);
}
