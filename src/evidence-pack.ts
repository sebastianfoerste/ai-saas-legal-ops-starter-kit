import {
  createLegalActionPlan,
  type LegalActionPlan,
  type LegalMatterData
} from './action-plan.js';
import { calculateRisk, type RiskAssessment } from './risk-scoring.js';

export type EvidenceFramework =
  | 'eu_ai_act'
  | 'gdpr'
  | 'nist_ai_rmf'
  | 'iso_42001'
  | 'dora'
  | 'internal_policy';

export type EvidenceStatus = 'satisfied' | 'missing' | 'needs_review' | 'not_applicable';
export type EvidencePriority = 'routine' | 'important' | 'critical';
export type EvidenceReadiness = 'ready' | 'review_needed' | 'blocked';

export interface EvidencePackOptions {
  generatedAt?: string;
  risk?: RiskAssessment;
  actionPlan?: LegalActionPlan;
}

export interface EvidenceItem {
  id: string;
  title: string;
  framework: EvidenceFramework;
  status: EvidenceStatus;
  priority: EvidencePriority;
  sourceFields: string[];
  evidenceRequired: string[];
  rationale: string;
}

export interface EvidencePack {
  schemaType: string;
  generatedAt: string;
  matterName: string;
  risk: RiskAssessment;
  actionPlan: LegalActionPlan;
  readiness: EvidenceReadiness;
  items: EvidenceItem[];
  missingEvidence: EvidenceItem[];
  requiredApprovals: string[];
  humanReviewRequired: boolean;
}

type EvidenceDraft = Omit<EvidenceItem, 'status'> & {
  status?: EvidenceStatus;
  presentWhen?: string[];
  reviewWhen?: boolean;
  missingWhen?: boolean;
  notApplicableWhen?: boolean;
};

const DORA_KEYWORDS = [
  'banking',
  'critical ict',
  'dora',
  'finance',
  'financial',
  'fintech',
  'insurance',
  'material outsourcing',
  'regulated'
];

const HIGH_RISK_DATA_KEYWORDS = [
  'bank statement',
  'biometric',
  'card',
  'credential',
  'credit',
  'health',
  'medical',
  'patient',
  'payment',
  'ssn'
];

const WEAK_SECURITY_KEYWORDS = ['self-assessment', 'self assessment', 'questionnaire only', 'pending'];
const NON_EU_TRANSFER_KEYWORDS = ['non-eu', 'us', 'united states', 'high-risk'];
const RETENTION_RISK_KEYWORDS = ['forever', 'indefinite', 'permanent', 'retained permanently', 'unlimited'];

export function createEvidencePack(
  schemaType: string,
  data: LegalMatterData,
  options: EvidencePackOptions = {}
): EvidencePack {
  const risk = options.risk ?? options.actionPlan?.risk ?? calculateRisk(schemaType, data);
  const actionPlan = options.actionPlan ?? createLegalActionPlan(schemaType, data, { risk });
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const typeKey = normalizeType(schemaType);
  const baseItems = buildEvidenceItems(typeKey, data, risk);
  const doraItems = hasDoraSignal(data) ? buildDoraItems(data) : [];
  const items = [...baseItems, ...doraItems];
  const missingEvidence = items.filter(item => item.status === 'missing' || item.status === 'needs_review');
  const readiness = determineReadiness(risk, actionPlan, items);

  return {
    schemaType,
    generatedAt,
    matterName: inferMatterName(typeKey, data),
    risk,
    actionPlan,
    readiness,
    items,
    missingEvidence,
    requiredApprovals: actionPlan.requiredApprovals,
    humanReviewRequired: readiness !== 'ready' || actionPlan.reviewGate !== 'self-serve'
  };
}

export function renderEvidencePackMarkdown(pack: EvidencePack): string {
  const approvals = pack.requiredApprovals.length > 0
    ? pack.requiredApprovals.map(approval => `- ${approval}`).join('\n')
    : '- None required by the deterministic action plan.';
  const riskReasons = pack.risk.reasons.map(reason => `- ${reason}`).join('\n');
  const checklistRows = pack.items
    .map(item => [
      item.id,
      frameworkLabel(item.framework),
      item.priority,
      item.status,
      item.title,
      item.evidenceRequired.join('; ')
    ].map(escapeMarkdownTableCell).join(' | '))
    .map(row => `| ${row} |`)
    .join('\n');
  const missingRows = pack.missingEvidence.length > 0
    ? pack.missingEvidence.map(item => `- [${item.priority}] ${item.title}: ${item.evidenceRequired.join('; ')}`).join('\n')
    : '- None.';

  return [
    `# AI Governance Evidence Pack: ${pack.matterName}`,
    '',
    `- Schema Type: ${pack.schemaType}`,
    `- Readiness: ${pack.readiness}`,
    `- Generated At: ${pack.generatedAt}`,
    '',
    '## Risk and Review Gate',
    '',
    `- Risk Level: ${pack.risk.level}`,
    `- Review Gate: ${pack.actionPlan.reviewGate}`,
    `- Action Priority: ${pack.actionPlan.priority}`,
    '',
    '### Trigger Reasons',
    '',
    riskReasons,
    '',
    '## Required Approvals',
    '',
    approvals,
    '',
    '## Evidence Checklist',
    '',
    '| ID | Framework | Priority | Status | Title | Evidence Required |',
    '| --- | --- | --- | --- | --- | --- |',
    checklistRows,
    '',
    '## Missing Evidence',
    '',
    missingRows,
    '',
    '## Human Review Notice',
    '',
    'This output is deterministic triage support only. Consequential legal, regulatory, contract, vendor, and product decisions require qualified human review.'
  ].join('\n');
}

function buildEvidenceItems(typeKey: string, data: LegalMatterData, risk: RiskAssessment): EvidenceItem[] {
  if (typeKey === 'productlaunchintake') {
    return buildProductLaunchEvidence(data, risk);
  }
  if (typeKey === 'aivendorreview') {
    return buildAiVendorEvidence(data);
  }
  if (typeKey === 'dpatriage') {
    return buildDpaEvidence(data, risk);
  }

  return [
    finalizeDraft(data, {
      id: 'generic.intake_payload',
      title: 'Validated intake payload',
      framework: 'internal_policy',
      priority: 'routine',
      presentWhen: [],
      status: 'needs_review',
      sourceFields: [],
      evidenceRequired: ['Validated payload, accountable owner, and triggered rule reasons.'],
      rationale: 'Matter types outside the core AI, product, and privacy scope receive a fallback evidence request.'
    })
  ];
}

function buildProductLaunchEvidence(data: LegalMatterData, risk: RiskAssessment): EvidenceItem[] {
  const hasAiFeature = hasArrayValue(data.aiFeatures);
  const hasSensitiveData = arrayContainsKeywords(data.dataInvolved, HIGH_RISK_DATA_KEYWORDS);
  const hasClaims = hasArrayValue(data.publicClaims);
  const hasCommitments = hasArrayValue(data.customerCommitmentsAffected);
  const hasHighRiskRegulatoryText = textContainsKeywords(data.regulatoryImpact, ['ai act', 'audit', 'bafin', 'dora', 'high-risk']);
  const aiGovernanceApplies = hasAiFeature || hasClaims || hasHighRiskRegulatoryText || risk.level !== 'low';

  return [
    finalizeDraft(data, {
      id: 'product.intended_purpose',
      title: 'Intended purpose and accountable launch owner',
      framework: 'internal_policy',
      priority: 'important',
      presentWhen: ['feature', 'owner', 'targetDate'],
      sourceFields: ['feature', 'owner', 'targetDate'],
      evidenceRequired: ['Launch brief naming the feature, owner, intended purpose, and target date.'],
      rationale: 'A launch cannot be reviewed without a clear owner and intended product purpose.'
    }),
    finalizeDraft(data, {
      id: 'product.ai_system_description',
      title: 'AI system and model description',
      framework: 'eu_ai_act',
      priority: hasAiFeature ? 'critical' : 'routine',
      status: hasAiFeature ? 'satisfied' : 'not_applicable',
      sourceFields: ['aiFeatures'],
      evidenceRequired: ['Description of models, AI services, training or fine-tuning pattern, and deployment context.'],
      rationale: 'AI governance review depends on the system description and model-use pattern.'
    }),
    finalizeDraft(data, {
      id: 'product.data_categories',
      title: 'Data category and privacy impact map',
      framework: 'gdpr',
      priority: hasSensitiveData ? 'critical' : 'important',
      presentWhen: ['dataInvolved'],
      reviewWhen: hasSensitiveData,
      sourceFields: ['dataInvolved', 'privacyImpact'],
      evidenceRequired: ['Data category map, privacy impact analysis, and affected data-subject categories where applicable.'],
      rationale: 'Sensitive or high-risk personal data requires privacy review before launch.'
    }),
    finalizeDraft(data, {
      id: 'product.claims_substantiation',
      title: 'Public claims substantiation',
      framework: 'internal_policy',
      priority: hasClaims ? 'critical' : 'routine',
      status: hasClaims ? 'needs_review' : 'not_applicable',
      sourceFields: ['publicClaims'],
      evidenceRequired: ['Claims substantiation file with test method, sample, owner, and approval record.'],
      rationale: 'Accuracy, hallucination, guarantee, and performance claims need evidence before publication.'
    }),
    finalizeDraft(data, {
      id: 'product.privacy_impact',
      title: 'Privacy impact and notice position',
      framework: 'gdpr',
      priority: hasSensitiveData ? 'critical' : 'important',
      presentWhen: ['privacyImpact'],
      reviewWhen: hasSensitiveData || textContainsKeywords(data.privacyImpact, ['dpia', 'consent', 'notice', 'high']),
      sourceFields: ['privacyImpact'],
      evidenceRequired: ['Privacy assessment, DPIA decision, consent analysis, and privacy notice update decision.'],
      rationale: 'Privacy impact must be documented when a new AI or data-processing feature launches.'
    }),
    finalizeDraft(data, {
      id: 'product.contract_impact',
      title: 'Contract and customer commitment impact',
      framework: 'internal_policy',
      priority: hasCommitments ? 'critical' : 'important',
      presentWhen: ['contractImpact'],
      reviewWhen: hasCommitments || textSuggestsAction(data.contractImpact, ['msa', 'dpa', 'requires', 'update']),
      sourceFields: ['contractImpact', 'customerCommitmentsAffected'],
      evidenceRequired: ['Contract impact memo and affected customer commitment owner confirmations.'],
      rationale: 'Launches that affect customer commitments or contract terms require legal and business owner review.'
    }),
    finalizeDraft(data, {
      id: 'product.regulatory_impact',
      title: 'Regulatory impact classification',
      framework: 'eu_ai_act',
      priority: hasHighRiskRegulatoryText ? 'critical' : 'important',
      presentWhen: ['regulatoryImpact'],
      reviewWhen: hasHighRiskRegulatoryText,
      sourceFields: ['regulatoryImpact', 'jurisdictions', 'customerSegment'],
      evidenceRequired: ['Regulatory classification memo covering AI Act, sector rules, and launch jurisdictions.'],
      rationale: 'Regulatory impact is needed to decide whether launch approval requires specialist review.'
    }),
    finalizeDraft(data, {
      id: 'product.human_oversight',
      title: 'Human oversight design',
      framework: 'eu_ai_act',
      priority: aiGovernanceApplies ? 'critical' : 'important',
      status: aiGovernanceApplies ? 'missing' : 'not_applicable',
      sourceFields: ['aiFeatures', 'regulatoryImpact'],
      evidenceRequired: ['Human oversight description, reviewer role, override path, and escalation trigger design.'],
      rationale: 'AI product launches need evidence that consequential outputs remain subject to accountable human oversight.'
    }),
    finalizeDraft(data, {
      id: 'product.technical_documentation',
      title: 'Technical documentation and quality management evidence',
      framework: 'iso_42001',
      priority: aiGovernanceApplies ? 'important' : 'routine',
      status: aiGovernanceApplies ? 'missing' : 'not_applicable',
      sourceFields: ['aiFeatures'],
      evidenceRequired: ['System card, model card or equivalent technical documentation, test evidence, and owner sign-off.'],
      rationale: 'AI management systems require durable documentation of design, controls, testing, and ownership.'
    }),
    finalizeDraft(data, {
      id: 'product.logging_audit_trail',
      title: 'Logging and audit trail design',
      framework: 'nist_ai_rmf',
      priority: aiGovernanceApplies ? 'important' : 'routine',
      status: aiGovernanceApplies ? 'missing' : 'not_applicable',
      sourceFields: ['aiFeatures'],
      evidenceRequired: ['Logging design, audit trail retention position, and incident review owner.'],
      rationale: 'Operational AI governance needs traceability for product decisions, claims, incidents, and overrides.'
    }),
    finalizeDraft(data, {
      id: 'product.customer_commitments',
      title: 'Affected customer commitment confirmations',
      framework: 'internal_policy',
      priority: hasCommitments ? 'critical' : 'routine',
      status: hasCommitments ? 'needs_review' : 'not_applicable',
      sourceFields: ['customerCommitmentsAffected'],
      evidenceRequired: ['Affected commitment register entries and written owner confirmations.'],
      rationale: 'Customer-specific commitments must be checked before launch changes alter processing, security, or service behavior.'
    })
  ];
}

function buildAiVendorEvidence(data: LegalMatterData): EvidenceItem[] {
  const trainsOnCustomerData = data.trainingOnCustomerData === true;
  const hasSensitiveData = arrayContainsKeywords(data.dataEntered, HIGH_RISK_DATA_KEYWORDS);
  const weakSecurityMaterial = !hasArrayValue(data.securityMaterial) || arrayContainsKeywords(data.securityMaterial, WEAK_SECURITY_KEYWORDS);
  const riskyRetention = textContainsKeywords(data.retentionPosition, RETENTION_RISK_KEYWORDS);
  const riskySubprocessor = arrayContainsKeywords(data.subprocessors, [...NON_EU_TRANSFER_KEYWORDS, 'unknown', 'unverified']);

  return [
    finalizeDraft(data, {
      id: 'vendor.identity',
      title: 'Vendor, tool, and business owner',
      framework: 'internal_policy',
      priority: 'important',
      presentWhen: ['vendor', 'tool', 'businessOwner'],
      sourceFields: ['vendor', 'tool', 'businessOwner'],
      evidenceRequired: ['Vendor record naming the tool, business owner, and accountable internal team.'],
      rationale: 'AI vendor approval requires a named provider, tool, and accountable business owner.'
    }),
    finalizeDraft(data, {
      id: 'vendor.use_case',
      title: 'Approved use case and output destination',
      framework: 'nist_ai_rmf',
      priority: 'important',
      presentWhen: ['useCase'],
      sourceFields: ['useCase', 'outputUse'],
      evidenceRequired: ['Use-case description, output destination, and approval boundary.'],
      rationale: 'The use case defines risk, permitted data, and downstream output controls.'
    }),
    finalizeDraft(data, {
      id: 'vendor.data_entered',
      title: 'Data entered into the AI tool',
      framework: 'gdpr',
      priority: hasSensitiveData ? 'critical' : 'important',
      presentWhen: ['dataEntered'],
      reviewWhen: hasSensitiveData,
      sourceFields: ['dataEntered'],
      evidenceRequired: ['Data category map and prohibited data controls for prompts, uploads, logs, and completions.'],
      rationale: 'Submitted data determines privacy, confidentiality, and security risk.'
    }),
    finalizeDraft(data, {
      id: 'vendor.output_use',
      title: 'Output use and publication boundary',
      framework: 'internal_policy',
      priority: 'important',
      presentWhen: ['outputUse'],
      sourceFields: ['outputUse'],
      evidenceRequired: ['Description of whether outputs are internal, customer-facing, public, or used for operational decisions.'],
      rationale: 'Output use controls determine whether additional legal, product, or customer review is needed.'
    }),
    finalizeDraft(data, {
      id: 'vendor.retention',
      title: 'Retention and deletion position',
      framework: 'gdpr',
      priority: riskyRetention ? 'critical' : 'important',
      presentWhen: ['retentionPosition'],
      reviewWhen: riskyRetention,
      sourceFields: ['retentionPosition'],
      evidenceRequired: ['Vendor retention terms, deletion process, and log retention position.'],
      rationale: 'Retention terms affect DPA commitments, deletion rights, confidentiality, and customer trust.'
    }),
    finalizeDraft(data, {
      id: 'vendor.model_training_opt_out',
      title: 'Model-training opt-out and vendor terms',
      framework: 'eu_ai_act',
      priority: 'critical',
      status: data.trainingOnCustomerData === false ? 'satisfied' : 'missing',
      sourceFields: ['trainingOnCustomerData'],
      evidenceRequired: ['Vendor terms proving customer inputs are excluded from base-model or public-model training.'],
      rationale: 'Customer data must not be used for vendor base-model training without explicit approval and contractual controls.'
    }),
    finalizeDraft(data, {
      id: 'vendor.subprocessors',
      title: 'Subprocessor and hosting-region evidence',
      framework: 'gdpr',
      priority: riskySubprocessor ? 'critical' : 'important',
      presentWhen: ['subprocessors'],
      reviewWhen: riskySubprocessor,
      sourceFields: ['subprocessors'],
      evidenceRequired: ['Subprocessor register, hosting-region map, transfer mechanism, and objection process.'],
      rationale: 'Subprocessors and hosting regions determine transfer risk and customer DPA compatibility.'
    }),
    finalizeDraft(data, {
      id: 'vendor.security_material',
      title: 'Security assurance material',
      framework: 'iso_42001',
      priority: 'critical',
      status: weakSecurityMaterial ? 'needs_review' : 'satisfied',
      sourceFields: ['securityMaterial'],
      evidenceRequired: ['SOC 2 Type II, ISO 27001, penetration test summary, security whitepaper, or equivalent assurance material.'],
      rationale: 'AI vendors need security evidence proportionate to the data and use case.'
    }),
    finalizeDraft(data, {
      id: 'vendor.approved_use',
      title: 'Approved use status',
      framework: 'internal_policy',
      priority: data.approvedUse === false ? 'critical' : 'important',
      status: data.approvedUse === true ? 'satisfied' : data.approvedUse === false ? 'needs_review' : 'missing',
      sourceFields: ['approvedUse'],
      evidenceRequired: ['Written approval decision and approved-use boundary.'],
      rationale: 'Vendor use should stay blocked or restricted until the accountable owner records the approval status.'
    }),
    finalizeDraft(data, {
      id: 'vendor.prohibited_use',
      title: 'Prohibited use cases and data types',
      framework: 'internal_policy',
      priority: 'important',
      presentWhen: ['prohibitedUse'],
      sourceFields: ['prohibitedUse'],
      evidenceRequired: ['Explicit prohibited-use list for restricted data, customer data, source code, and regulated decisions.'],
      rationale: 'Prohibited-use boundaries keep approved tools from expanding into unapproved risk profiles.'
    }),
    finalizeDraft(data, {
      id: 'vendor.conditions',
      title: 'Usage conditions and control requirements',
      framework: 'internal_policy',
      priority: 'important',
      presentWhen: ['conditions'],
      sourceFields: ['conditions'],
      evidenceRequired: ['Usage conditions, configuration controls, owner attestations, and renewal cadence.'],
      rationale: 'Conditional approvals need durable control requirements and a review cadence.'
    }),
    finalizeDraft(data, {
      id: 'vendor.training_risk_review',
      title: 'Customer-data training risk review',
      framework: 'nist_ai_rmf',
      priority: trainsOnCustomerData ? 'critical' : 'routine',
      status: trainsOnCustomerData ? 'missing' : 'not_applicable',
      sourceFields: ['trainingOnCustomerData', 'retentionPosition'],
      evidenceRequired: ['Risk acceptance memo or rejection decision for any customer-data training pathway.'],
      rationale: 'Training on customer data changes the risk profile and requires explicit rejection or accountable approval.'
    })
  ];
}

function buildDpaEvidence(data: LegalMatterData, risk: RiskAssessment): EvidenceItem[] {
  const hasSpecialCategoryData = hasArrayValue(data.specialCategoryData);
  const hasSensitiveData = arrayContainsKeywords(data.personalDataCategories, HIGH_RISK_DATA_KEYWORDS);
  const riskyTransfer = arrayContainsKeywords(data.transferLocations, NON_EU_TRANSFER_KEYWORDS);
  const riskySubprocessor = arrayContainsObjectKeywords(data.subprocessors, [...NON_EU_TRANSFER_KEYWORDS, 'unknown', 'unverified']);
  const riskyRetention = textContainsKeywords(data.retentionPeriod, RETENTION_RISK_KEYWORDS);
  const customSecurity = textContainsKeywords(data.securityAnnexStatus, ['custom', 'pending']);
  const missingFacts = hasArrayValue(data.missingFacts);
  const dpiaApplies = hasSpecialCategoryData || hasSensitiveData || risk.level === 'high' || risk.level === 'escalate';

  return [
    finalizeDraft(data, {
      id: 'dpa.role',
      title: 'Controller, processor, or joint-controller role',
      framework: 'gdpr',
      priority: 'important',
      presentWhen: ['role'],
      sourceFields: ['role'],
      evidenceRequired: ['Documented GDPR role allocation and relevant contract position.'],
      rationale: 'Role allocation determines DPA obligations, controller instructions, and customer review path.'
    }),
    finalizeDraft(data, {
      id: 'dpa.data_subjects',
      title: 'Data subjects covered by processing',
      framework: 'gdpr',
      priority: 'important',
      presentWhen: ['dataSubjects'],
      sourceFields: ['dataSubjects'],
      evidenceRequired: ['Data-subject category list and affected processing context.'],
      rationale: 'Data subjects define privacy risk and disclosure obligations.'
    }),
    finalizeDraft(data, {
      id: 'dpa.personal_data_categories',
      title: 'Personal data category map',
      framework: 'gdpr',
      priority: hasSensitiveData ? 'critical' : 'important',
      presentWhen: ['personalDataCategories'],
      reviewWhen: hasSensitiveData,
      sourceFields: ['personalDataCategories'],
      evidenceRequired: ['Personal data category map and processing purpose summary.'],
      rationale: 'The DPA must accurately describe categories of personal data processed.'
    }),
    finalizeDraft(data, {
      id: 'dpa.special_category_data',
      title: 'Special category data review',
      framework: 'gdpr',
      priority: hasSpecialCategoryData ? 'critical' : 'routine',
      status: hasSpecialCategoryData ? 'needs_review' : 'not_applicable',
      sourceFields: ['specialCategoryData'],
      evidenceRequired: ['Special category processing basis, safeguards, and DPIA decision.'],
      rationale: 'GDPR Art. 9 data requires elevated privacy review and documented safeguards.'
    }),
    finalizeDraft(data, {
      id: 'dpa.transfer_locations',
      title: 'Transfer locations and mechanism',
      framework: 'gdpr',
      priority: riskyTransfer ? 'critical' : 'important',
      presentWhen: ['transferLocations'],
      reviewWhen: riskyTransfer,
      sourceFields: ['transferLocations'],
      evidenceRequired: ['Transfer map, adequacy or SCC position, and transfer impact assessment decision.'],
      rationale: 'International transfers require documented transfer mechanism and customer-facing consistency.'
    }),
    finalizeDraft(data, {
      id: 'dpa.subprocessors',
      title: 'Subprocessor list and objection process',
      framework: 'gdpr',
      priority: riskySubprocessor ? 'critical' : 'important',
      presentWhen: ['subprocessors'],
      reviewWhen: riskySubprocessor,
      sourceFields: ['subprocessors'],
      evidenceRequired: ['Subprocessor list, locations, purposes, transfer mechanism, and objection process.'],
      rationale: 'Customers need a reliable subprocessor position before DPA approval.'
    }),
    finalizeDraft(data, {
      id: 'dpa.retention',
      title: 'Retention period',
      framework: 'gdpr',
      priority: riskyRetention ? 'critical' : 'important',
      presentWhen: ['retentionPeriod'],
      reviewWhen: riskyRetention,
      sourceFields: ['retentionPeriod'],
      evidenceRequired: ['Retention schedule aligned with product behavior and customer contract terms.'],
      rationale: 'Retention must match the service, DPA, deletion process, and customer commitments.'
    }),
    finalizeDraft(data, {
      id: 'dpa.deletion',
      title: 'Deletion process and SLA',
      framework: 'gdpr',
      priority: textContainsKeywords(data.deletionProcess, ['90 days', 'manual', 'negotiated']) ? 'critical' : 'important',
      presentWhen: ['deletionProcess'],
      reviewWhen: textContainsKeywords(data.deletionProcess, ['90 days', 'manual', 'negotiated']),
      sourceFields: ['deletionProcess'],
      evidenceRequired: ['Deletion workflow, SLA, certification process, and owner confirmation.'],
      rationale: 'Deletion commitments must be operationally feasible and aligned with the DPA.'
    }),
    finalizeDraft(data, {
      id: 'dpa.security_annex',
      title: 'Security annex and TOMs status',
      framework: 'iso_42001',
      priority: customSecurity ? 'critical' : 'important',
      presentWhen: ['securityAnnexStatus'],
      reviewWhen: customSecurity,
      sourceFields: ['securityAnnexStatus'],
      evidenceRequired: ['Technical and organisational measures, security annex status, and custom requirement review.'],
      rationale: 'Security annex deviations require legal, security, and privacy alignment.'
    }),
    finalizeDraft(data, {
      id: 'dpa.missing_facts',
      title: 'Missing facts closure',
      framework: 'internal_policy',
      priority: missingFacts ? 'critical' : 'routine',
      status: missingFacts ? 'missing' : 'satisfied',
      sourceFields: ['missingFacts'],
      evidenceRequired: ['Written answers to every missing fact before final DPA approval.'],
      rationale: 'Open facts should be closed before a reviewer approves the DPA position.'
    }),
    finalizeDraft(data, {
      id: 'dpa.dpia_review',
      title: 'DPIA review decision',
      framework: 'gdpr',
      priority: dpiaApplies ? 'critical' : 'routine',
      status: dpiaApplies ? 'missing' : 'not_applicable',
      sourceFields: ['specialCategoryData', 'personalDataCategories', 'riskLevel'],
      evidenceRequired: ['DPIA decision, transfer assessment decision, and DPO sign-off where required.'],
      rationale: 'High-risk processing and special category data require a documented DPIA decision.'
    })
  ];
}

function buildDoraItems(data: LegalMatterData): EvidenceItem[] {
  return [
    finalizeDraft(data, {
      id: 'dora.ict_third_party_register',
      title: 'DORA ICT third-party register evidence',
      framework: 'dora',
      priority: 'important',
      status: 'needs_review',
      sourceFields: ['vendor', 'tool', 'subprocessors', 'customerSector', 'customerSegment', 'regulatoryImpact'],
      evidenceRequired: ['ICT service description, provider record, subcontractor chain, materiality assessment, and exit or substitution position.'],
      rationale: 'Regulated financial-sector use cases require structured ICT third-party risk evidence and concentration-risk visibility.'
    })
  ];
}

function finalizeDraft(data: LegalMatterData, draft: EvidenceDraft): EvidenceItem {
  const status = draft.status ?? deriveStatus(data, draft);

  return {
    id: draft.id,
    title: draft.title,
    framework: draft.framework,
    status,
    priority: draft.priority,
    sourceFields: draft.sourceFields,
    evidenceRequired: draft.evidenceRequired,
    rationale: draft.rationale
  };
}

function deriveStatus(data: LegalMatterData, draft: EvidenceDraft): EvidenceStatus {
  if (draft.notApplicableWhen) {
    return 'not_applicable';
  }
  if (draft.missingWhen) {
    return 'missing';
  }
  if (draft.presentWhen && !draft.presentWhen.every(field => hasValue(data[field]))) {
    return 'missing';
  }
  if (draft.reviewWhen) {
    return 'needs_review';
  }
  return 'satisfied';
}

function determineReadiness(
  risk: RiskAssessment,
  actionPlan: LegalActionPlan,
  items: EvidenceItem[]
): EvidenceReadiness {
  const hasCriticalMissing = items.some(item => item.priority === 'critical' && item.status === 'missing');
  const hasOpenEvidence = items.some(item => item.status === 'missing' || item.status === 'needs_review');

  if (risk.level === 'escalate' || actionPlan.priority === 'blocked' || hasCriticalMissing) {
    return 'blocked';
  }
  if (risk.level === 'medium' || risk.level === 'high' || hasOpenEvidence) {
    return 'review_needed';
  }
  return 'ready';
}

function inferMatterName(typeKey: string, data: LegalMatterData): string {
  if (typeKey === 'productlaunchintake' && typeof data.feature === 'string') {
    return data.feature;
  }
  if (typeKey === 'aivendorreview') {
    const vendor = typeof data.vendor === 'string' ? data.vendor : undefined;
    const tool = typeof data.tool === 'string' ? data.tool : undefined;
    return [vendor, tool].filter(Boolean).join(' - ') || 'AI Vendor Review';
  }
  if (typeKey === 'dpatriage' && typeof data.productOrService === 'string') {
    return data.productOrService;
  }
  if (typeof data.customer === 'string') {
    return data.customer;
  }
  return 'Legal Matter';
}

function hasDoraSignal(data: LegalMatterData): boolean {
  if (data.regulatedCustomer === true) {
    return true;
  }
  return objectContainsKeywords(data, DORA_KEYWORDS);
}

function normalizeType(schemaType: string): string {
  return schemaType.toLowerCase().replace(/[^a-z]/g, '');
}

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null;
}

function hasArrayValue(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function textContainsKeywords(value: unknown, keywords: string[]): boolean {
  return typeof value === 'string' && keywords.some(keyword => value.toLowerCase().includes(keyword));
}

function textSuggestsAction(value: unknown, keywords: string[]): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('no ') || normalized.startsWith('none') || normalized.includes(' no ')) {
    return false;
  }

  return keywords.some(keyword => normalized.includes(keyword));
}

function arrayContainsKeywords(value: unknown, keywords: string[]): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some(item => valueContainsKeywords(item, keywords));
}

function arrayContainsObjectKeywords(value: unknown, keywords: string[]): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some(item => valueContainsKeywords(item, keywords));
}

function objectContainsKeywords(value: unknown, keywords: string[]): boolean {
  return valueContainsKeywords(value, keywords);
}

function valueContainsKeywords(value: unknown, keywords: string[]): boolean {
  const normalized = flattenValue(value).join(' ').toLowerCase();
  return keywords.some(keyword => normalized.includes(keyword));
}

function flattenValue(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => flattenValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(item => flattenValue(item));
  }
  return [];
}

function frameworkLabel(framework: EvidenceFramework): string {
  const labels: Record<EvidenceFramework, string> = {
    dora: 'DORA',
    eu_ai_act: 'EU AI Act',
    gdpr: 'GDPR',
    internal_policy: 'Internal Policy',
    iso_42001: 'ISO/IEC 42001',
    nist_ai_rmf: 'NIST AI RMF'
  };
  return labels[framework];
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
