import {
  createLegalActionPlan,
  type LegalActionPlan,
  type LegalMatterData
} from './action-plan.js';
import { calculateRisk, type RiskAssessment } from './risk-scoring.js';

export type ContractClauseCategory =
  | 'ai_data_use'
  | 'audit_rights'
  | 'confidentiality'
  | 'data_residency'
  | 'data_security'
  | 'general'
  | 'ip_ownership'
  | 'liability'
  | 'service_levels'
  | 'subprocessor_notice'
  | 'termination';

export type ContractDeviationSeverity = 'standard' | 'negotiable' | 'requires_approval' | 'nonstarter';

export interface ContractPlaybookOptions {
  generatedAt?: string;
  risk?: RiskAssessment;
  actionPlan?: LegalActionPlan;
}

export interface ContractPlaybookDeviation {
  id: string;
  category: ContractClauseCategory;
  severity: ContractDeviationSeverity;
  sourceText: string;
  issue: string;
  standardPosition: string;
  fallbackPosition: string;
  approvalRequired: string[];
  rationale: string;
}

export interface ContractPlaybookReview {
  generatedAt: string;
  customer: string;
  contractType: string;
  dealStage: string;
  risk: RiskAssessment;
  actionPlan: LegalActionPlan;
  deviations: ContractPlaybookDeviation[];
  nonStarters: ContractPlaybookDeviation[];
  approvalRequired: string[];
  negotiationSummary: string;
  reviewerNotes: string[];
  humanReviewRequired: boolean;
}

interface PlaybookRule {
  id: string;
  category: ContractClauseCategory;
  keywords: string[];
  severity: ContractDeviationSeverity;
  issue: string;
  standardPosition: string;
  fallbackPosition: string;
  approvalRequired: string[];
  rationale: string;
}

const RULES: PlaybookRule[] = [
  {
    id: 'liability.uncapped',
    category: 'liability',
    keywords: ['uncapped liability', 'unlimited liability', 'uncapped indemnity', 'unlimited indemnity'],
    severity: 'nonstarter',
    issue: 'The customer requests uncapped liability or indemnity exposure.',
    standardPosition: 'Liability remains capped under the standard MSA, with narrow agreed carve-outs only where approved.',
    fallbackPosition: 'Reject uncapped exposure. Offer a defined super-cap for specified data-security claims with insurance-backed limits and no indirect damages.',
    approvalRequired: ['GC Approval', 'Finance Approval'],
    rationale: 'Uncapped liability can create exposure disproportionate to annual contract value and insurance coverage.'
  },
  {
    id: 'liability.super_cap',
    category: 'liability',
    keywords: ['10x liability', '5x liability', 'security breach', 'data breach', 'liability cap'],
    severity: 'requires_approval',
    issue: 'The customer requests an elevated liability cap for security, privacy, or breach claims.',
    standardPosition: 'General liability stays at the standard cap. Security and privacy claims require legal-approved carve-outs.',
    fallbackPosition: 'Offer a capped security or privacy super-cap up to 2x annual fees, subject to final legal and finance approval.',
    approvalRequired: ['Senior Legal Review', 'Finance Approval', 'GC Approval'],
    rationale: 'Caps above the standard position need commercial, insurance, and legal alignment before acceptance.'
  },
  {
    id: 'audit.weekly_or_third_party',
    category: 'audit_rights',
    keywords: ['weekly audit', 'third-party weekly', 'third party weekly', 'audit rights', 'physical server', 'server locations'],
    severity: 'requires_approval',
    issue: 'The customer requests intrusive, frequent, or third-party audit rights.',
    standardPosition: 'Provide standard security materials, certifications, and reasonable annual audit support.',
    fallbackPosition: 'Offer annual remote audit rights through security documentation, SOC 2 or ISO evidence, and incident-triggered review rights with notice and confidentiality.',
    approvalRequired: ['Security Review', 'Senior Legal Review'],
    rationale: 'Broad audit rights can create operational disruption, confidentiality risk, and inconsistent customer commitments.'
  },
  {
    id: 'ai.training',
    category: 'ai_data_use',
    keywords: ['training opt-out', 'train models', 'model training', 'base model training', 'fine-tuning', 'fine tuning'],
    severity: 'requires_approval',
    issue: 'The customer asks for AI data-use, model-training, or training opt-out commitments.',
    standardPosition: 'Customer inputs are not used to train public or base models unless expressly approved in writing.',
    fallbackPosition: 'Confirm contractual model-training exclusion, maintain approved vendor terms, and offer evidence through the AI vendor register or security pack.',
    approvalRequired: ['Privacy Review', 'Security Review', 'GC Approval'],
    rationale: 'AI data-use commitments affect vendor selection, DPA terms, customer trust, and product architecture.'
  },
  {
    id: 'subprocessor.notice',
    category: 'subprocessor_notice',
    keywords: ['model provider changes', 'subprocessor changes', '90 days notice', 'prior notice', 'vendor changes'],
    severity: 'negotiable',
    issue: 'The customer requests extended notice or approval rights for model provider or subprocessor changes.',
    standardPosition: 'Subprocessor changes follow the standard notice and objection process in the DPA.',
    fallbackPosition: 'Offer advance notice with objection rights, but avoid customer veto rights over provider changes needed for security, resilience, or service continuity.',
    approvalRequired: ['DPO Sign-off'],
    rationale: 'Extended notice can be acceptable when it preserves operational flexibility and avoids hidden customer vetoes.'
  },
  {
    id: 'data.residency',
    category: 'data_residency',
    keywords: ['data residency', 'germany-only', 'germany only', 'eu data boundary', 'frankfurt', 'no us transfer'],
    severity: 'requires_approval',
    issue: 'The customer requests regional data residency or transfer restrictions.',
    standardPosition: 'Regional processing commitments follow the published product and DPA data boundary.',
    fallbackPosition: 'Accept only where product architecture, subprocessors, support access, and disaster recovery can meet the commitment.',
    approvalRequired: ['DPO Sign-off', 'Security Review', 'Infrastructure Owner Approval'],
    rationale: 'Data residency commitments must match actual routing, support, logging, vendor, and failover behavior.'
  },
  {
    id: 'ip.ownership',
    category: 'ip_ownership',
    keywords: ['custom ip ownership', 'customer owns all improvements', 'assignment of improvements', 'work product ownership'],
    severity: 'requires_approval',
    issue: 'The customer requests ownership of product improvements, model behavior, or platform work product.',
    standardPosition: 'The company retains platform, model, workflow, and product improvement IP.',
    fallbackPosition: 'Customer may own its inputs and outputs, while the company retains platform, telemetry, know-how, templates, and general improvements.',
    approvalRequired: ['Senior Legal Review', 'Product Owner Approval'],
    rationale: 'Overbroad IP terms can restrict product development and create conflicting ownership promises.'
  },
  {
    id: 'service_levels.custom',
    category: 'service_levels',
    keywords: ['custom sla', 'service credits', 'uptime guarantee', 'penalty', 'liquidated damages'],
    severity: 'negotiable',
    issue: 'The customer requests custom service levels, credits, or operational penalties.',
    standardPosition: 'Service levels and credits follow the standard SLA.',
    fallbackPosition: 'Offer capped service credits as the exclusive remedy for verified availability failures, excluding force majeure and customer-side issues.',
    approvalRequired: ['Commercial Owner Approval', 'Senior Legal Review'],
    rationale: 'Custom service levels need operational feasibility and a clear exclusive-remedy structure.'
  },
  {
    id: 'termination.convenience',
    category: 'termination',
    keywords: ['termination for convenience', 'terminate for convenience', 'refund on termination', 'walk-away right'],
    severity: 'negotiable',
    issue: 'The customer requests broad termination or refund rights.',
    standardPosition: 'Termination rights remain limited to cause, non-payment, or agreed statutory grounds.',
    fallbackPosition: 'Offer a defined transition assistance period or renewal opt-out instead of mid-term convenience termination.',
    approvalRequired: ['Commercial Owner Approval', 'Senior Legal Review'],
    rationale: 'Broad termination rights can undermine revenue predictability and implementation commitments.'
  }
];

const SENSITIVE_SECTORS = ['banking', 'finance', 'fintech', 'healthcare', 'insurance'];

export function createContractPlaybookReview(
  data: LegalMatterData,
  options: ContractPlaybookOptions = {}
): ContractPlaybookReview {
  const risk = options.risk ?? options.actionPlan?.risk ?? calculateRisk('SaaSContractIntake', data);
  const actionPlan = options.actionPlan ?? createLegalActionPlan('SaaSContractIntake', data, { risk });
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const deviations = buildDeviations(data);
  const nonStarters = deviations.filter(deviation => deviation.severity === 'nonstarter');
  const approvalRequired = uniqueStrings([
    ...actionPlan.requiredApprovals,
    ...deviations.flatMap(deviation => deviation.approvalRequired)
  ]);
  const reviewerNotes = buildReviewerNotes(data, deviations, risk);

  return {
    generatedAt,
    customer: stringValue(data.customer, 'Unknown Customer'),
    contractType: stringValue(data.contractType, 'Unknown Contract'),
    dealStage: stringValue(data.dealStage, 'Unknown Stage'),
    risk,
    actionPlan,
    deviations,
    nonStarters,
    approvalRequired,
    negotiationSummary: buildNegotiationSummary(data, deviations, nonStarters),
    reviewerNotes,
    humanReviewRequired: risk.level !== 'low' || deviations.length > 0 || actionPlan.reviewGate !== 'self-serve'
  };
}

export function renderContractPlaybookMarkdown(review: ContractPlaybookReview): string {
  const approvals = review.approvalRequired.length > 0
    ? review.approvalRequired.map(approval => `- ${approval}`).join('\n')
    : '- None required by the deterministic playbook.';
  const nonStarters = review.nonStarters.length > 0
    ? review.nonStarters.map(deviation => `- ${deviation.issue}`).join('\n')
    : '- None identified.';
  const deviationRows = review.deviations.length > 0
    ? review.deviations
      .map(deviation => [
        deviation.id,
        deviation.category,
        deviation.severity,
        deviation.issue,
        deviation.fallbackPosition
      ].map(escapeMarkdownTableCell).join(' | '))
      .map(row => `| ${row} |`)
      .join('\n')
    : '| None | general | standard | No clause deviations detected. | Use standard contract position. |';
  const notes = review.reviewerNotes.length > 0
    ? review.reviewerNotes.map(note => `- ${note}`).join('\n')
    : '- No reviewer notes generated.';

  return [
    `# Contract Playbook Review: ${review.customer}`,
    '',
    `- Contract Type: ${review.contractType}`,
    `- Deal Stage: ${review.dealStage}`,
    `- Generated At: ${review.generatedAt}`,
    `- Risk Level: ${review.risk.level}`,
    `- Review Gate: ${review.actionPlan.reviewGate}`,
    '',
    '## Negotiation Summary',
    '',
    review.negotiationSummary,
    '',
    '## Required Approvals',
    '',
    approvals,
    '',
    '## Non-Starters',
    '',
    nonStarters,
    '',
    '## Clause Deviation Table',
    '',
    '| ID | Category | Severity | Issue | Fallback Position |',
    '| --- | --- | --- | --- | --- |',
    deviationRows,
    '',
    '## Reviewer Notes',
    '',
    notes,
    '',
    '## Human Review Notice',
    '',
    'This output is deterministic negotiation support only. A qualified reviewer must approve any external contract position, customer communication, or playbook exception.'
  ].join('\n');
}

function buildDeviations(data: LegalMatterData): ContractPlaybookDeviation[] {
  const sourceTexts = collectSourceTexts(data);
  const deviations: ContractPlaybookDeviation[] = [];

  for (const sourceText of sourceTexts) {
    const matchedRules = RULES.filter(rule => matchesRule(sourceText, rule));
    if (matchedRules.length === 0) {
      deviations.push(createGeneralDeviation(sourceText));
      continue;
    }

    for (const rule of matchedRules) {
      deviations.push(createDeviation(rule, sourceText));
    }
  }

  if (data.regulatedCustomer === true || isSensitiveSector(data.customerSector)) {
    deviations.push(createRegulatedCustomerDeviation(data));
  }
  if (hasSensitiveData(data.dataCategories)) {
    deviations.push(createSensitiveDataDeviation(data));
  }
  if (hasArrayValue(data.aiFeaturesInvolved) && !deviations.some(deviation => deviation.category === 'ai_data_use')) {
    deviations.push(createAiFeatureDeviation(data));
  }

  return dedupeDeviations(deviations);
}

function collectSourceTexts(data: LegalMatterData): string[] {
  return uniqueStrings([
    ...toStringArray(data.nonStandardTerms),
    ...toStringArray(data.redFlags),
    ...toOptionalStringArray(data.legalQuestion)
  ]);
}

function matchesRule(sourceText: string, rule: PlaybookRule): boolean {
  const normalized = sourceText.toLowerCase();
  return rule.keywords.some(keyword => normalized.includes(keyword));
}

function createDeviation(rule: PlaybookRule, sourceText: string): ContractPlaybookDeviation {
  return {
    id: rule.id,
    category: rule.category,
    severity: rule.severity,
    sourceText,
    issue: rule.issue,
    standardPosition: rule.standardPosition,
    fallbackPosition: rule.fallbackPosition,
    approvalRequired: rule.approvalRequired,
    rationale: rule.rationale
  };
}

function createGeneralDeviation(sourceText: string): ContractPlaybookDeviation {
  return {
    id: `general.${slugify(sourceText)}`,
    category: 'general',
    severity: 'requires_approval',
    sourceText,
    issue: 'The customer requested a non-standard position that is not mapped to a specific playbook rule.',
    standardPosition: 'Use the standard agreement position unless legal approves a written exception.',
    fallbackPosition: 'Ask the requester for business rationale, customer wording, and operational impact before proposing a fallback.',
    approvalRequired: ['Senior Legal Review'],
    rationale: 'Unmapped deviations should be reviewed before external negotiation to avoid silent playbook drift.'
  };
}

function createRegulatedCustomerDeviation(data: LegalMatterData): ContractPlaybookDeviation {
  const sector = stringValue(data.customerSector, 'regulated sector');

  return {
    id: 'customer.regulated_sector',
    category: 'data_security',
    severity: 'requires_approval',
    sourceText: `Customer sector: ${sector}`,
    issue: 'The customer operates in a regulated or sensitive sector.',
    standardPosition: 'Regulated customer terms must stay aligned with the standard security, DPA, audit, and customer commitment framework.',
    fallbackPosition: 'Offer documented security materials, DPA-aligned commitments, and specific operational evidence instead of open-ended regulatory undertakings.',
    approvalRequired: ['Senior Legal Review', 'Security Review', 'DPO Sign-off'],
    rationale: 'Regulated customers often require commitments that affect audits, data processing, outsourcing, and operational resilience.'
  };
}

function createSensitiveDataDeviation(data: LegalMatterData): ContractPlaybookDeviation {
  return {
    id: 'data.sensitive_categories',
    category: 'data_security',
    severity: 'requires_approval',
    sourceText: `Data categories: ${toStringArray(data.dataCategories).join(', ')}`,
    issue: 'The deal involves sensitive or high-risk data categories.',
    standardPosition: 'Sensitive data processing must follow the approved DPA, security baseline, and product data boundary.',
    fallbackPosition: 'Condition acceptance on DPO review, security confirmation, and evidence that product controls support the proposed data categories.',
    approvalRequired: ['DPO Sign-off', 'Security Review'],
    rationale: 'Sensitive data commitments must be tied to actual product controls and privacy safeguards.'
  };
}

function createAiFeatureDeviation(data: LegalMatterData): ContractPlaybookDeviation {
  return {
    id: 'ai.features_involved',
    category: 'ai_data_use',
    severity: 'requires_approval',
    sourceText: `AI features: ${toStringArray(data.aiFeaturesInvolved).join(', ')}`,
    issue: 'The customer will use AI features under the contract.',
    standardPosition: 'AI features must remain subject to approved AI vendor terms, data-use restrictions, and human review controls.',
    fallbackPosition: 'Provide AI use-policy evidence and vendor terms while refusing commitments that exceed validated product controls.',
    approvalRequired: ['Privacy Review', 'Security Review', 'Product Owner Approval'],
    rationale: 'AI feature commitments can affect vendor terms, output reliance, privacy notices, and customer-facing representations.'
  };
}

function buildReviewerNotes(
  data: LegalMatterData,
  deviations: ContractPlaybookDeviation[],
  risk: RiskAssessment
): string[] {
  const notes = [
    `Risk level is ${risk.level}.`,
    `Detected ${deviations.length} clause ${deviations.length === 1 ? 'deviation' : 'deviations'}.`
  ];

  if (typeof data.businessPosition === 'string' && data.businessPosition.trim().length > 0) {
    notes.push(`Business position: ${data.businessPosition}`);
  }
  if (typeof data.legalQuestion === 'string' && data.legalQuestion.trim().length > 0) {
    notes.push(`Legal question: ${data.legalQuestion}`);
  }
  if (deviations.some(deviation => deviation.severity === 'nonstarter')) {
    notes.push('Do not send fallback wording externally until GC has reviewed the non-starter item.');
  }
  if (deviations.some(deviation => deviation.category === 'data_residency')) {
    notes.push('Confirm product, support, logging, subprocessors, and disaster recovery before accepting data residency wording.');
  }
  if (deviations.some(deviation => deviation.category === 'ai_data_use')) {
    notes.push('Confirm vendor model-training terms and customer-data exclusion evidence before accepting AI wording.');
  }

  return notes;
}

function buildNegotiationSummary(
  data: LegalMatterData,
  deviations: ContractPlaybookDeviation[],
  nonStarters: ContractPlaybookDeviation[]
): string {
  const customer = stringValue(data.customer, 'The customer');
  if (deviations.length === 0) {
    return `${customer} can proceed on the standard contract path. No clause deviations were detected.`;
  }

  const highestSeverity = maxSeverity(deviations);
  const nonStarterText = nonStarters.length > 0
    ? ` ${nonStarters.length} non-starter ${nonStarters.length === 1 ? 'position requires' : 'positions require'} GC review before any external response.`
    : '';

  return `${customer} has ${deviations.length} detected clause ${deviations.length === 1 ? 'deviation' : 'deviations'}. Highest severity is ${highestSeverity}.${nonStarterText} Use the fallback positions as internal negotiation guidance and record any approved exception in the playbook.`;
}

function maxSeverity(deviations: ContractPlaybookDeviation[]): ContractDeviationSeverity {
  const order: ContractDeviationSeverity[] = ['standard', 'negotiable', 'requires_approval', 'nonstarter'];
  let current: ContractDeviationSeverity = 'standard';

  for (const deviation of deviations) {
    if (order.indexOf(deviation.severity) > order.indexOf(current)) {
      current = deviation.severity;
    }
  }

  return current;
}

function dedupeDeviations(deviations: ContractPlaybookDeviation[]): ContractPlaybookDeviation[] {
  const seen = new Set<string>();
  const result: ContractPlaybookDeviation[] = [];

  for (const deviation of deviations) {
    const key = `${deviation.id}:${deviation.sourceText.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(deviation);
  }

  return result;
}

function hasSensitiveData(value: unknown): boolean {
  const sensitiveKeywords = ['biometric', 'card', 'credential', 'health', 'medical', 'patient', 'payment', 'ssn'];
  return toStringArray(value).some(item => {
    const normalized = item.toLowerCase();
    return sensitiveKeywords.some(keyword => normalized.includes(keyword));
  });
}

function isSensitiveSector(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return SENSITIVE_SECTORS.includes(value.toLowerCase());
}

function hasArrayValue(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function toOptionalStringArray(value: unknown): string[] {
  return typeof value === 'string' && value.trim().length > 0 ? [value] : [];
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

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return slug || 'unmapped';
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
