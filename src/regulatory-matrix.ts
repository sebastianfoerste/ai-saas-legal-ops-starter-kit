import {
  createLegalActionPlan,
  type LegalActionPlan,
  type LegalMatterData
} from './action-plan.js';
import { type EvidenceFramework } from './evidence-pack.js';
import { calculateRisk, type RiskAssessment } from './risk-scoring.js';
import { normalizeSchemaType } from './workflows.js';

export type RegulatoryFramework =
  | EvidenceFramework
  | 'data_act'
  | 'cra'
  | 'owasp_genai';

export type RegulatoryReadiness = 'satisfied' | 'needs_review' | 'missing' | 'not_applicable';

export interface RegulatoryObligationRow {
  id: string;
  framework: RegulatoryFramework;
  obligation: string;
  trigger: string;
  sourceFields: string[];
  evidenceRequired: string[];
  owner: string;
  reviewGate: string;
  readiness: RegulatoryReadiness;
  rationale: string;
}

export interface RegulatoryObligationMatrixOptions {
  generatedAt?: string;
  risk?: RiskAssessment;
  actionPlan?: LegalActionPlan;
}

export interface RegulatoryObligationMatrix {
  schemaType: string;
  generatedAt: string;
  matterName: string;
  risk: RiskAssessment;
  actionPlan: LegalActionPlan;
  rows: RegulatoryObligationRow[];
  gaps: RegulatoryObligationRow[];
  humanReviewRequired: boolean;
  humanReviewNotice: string;
}

interface RowDraft {
  id: string;
  framework: RegulatoryFramework;
  obligation: string;
  trigger: string;
  sourceFields: string[];
  evidenceRequired: string[];
  owner: string;
  reviewGate: string;
  rationale: string;
  requiredFields?: string[];
  appliesWhen?: (data: LegalMatterData) => boolean;
  reviewWhen?: (data: LegalMatterData) => boolean;
  missingWhen?: (data: LegalMatterData) => boolean;
  readiness?: RegulatoryReadiness;
}

const HUMAN_REVIEW_NOTICE = 'This matrix is deterministic triage and evidence support only. A qualified reviewer must decide legal interpretation, regulatory classification, and approval.';

export function createRegulatoryObligationMatrix(
  schemaType: string,
  data: LegalMatterData,
  options: RegulatoryObligationMatrixOptions = {}
): RegulatoryObligationMatrix {
  const risk = options.risk ?? options.actionPlan?.risk ?? calculateRisk(schemaType, data);
  const actionPlan = options.actionPlan ?? createLegalActionPlan(schemaType, data, { risk });
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const typeKey = normalizeSchemaType(schemaType);
  const rows = buildRows(typeKey, data).map(draft => finalizeRow(draft, data));
  const gaps = rows.filter(row => row.readiness === 'missing' || row.readiness === 'needs_review');

  return {
    schemaType,
    generatedAt,
    matterName: inferMatterName(typeKey, data),
    risk,
    actionPlan,
    rows,
    gaps,
    humanReviewRequired: gaps.length > 0 || actionPlan.reviewGate !== 'self-serve' || risk.level !== 'low',
    humanReviewNotice: HUMAN_REVIEW_NOTICE
  };
}

export function renderRegulatoryObligationMatrixMarkdown(matrix: RegulatoryObligationMatrix): string {
  const rows = matrix.rows
    .map(row => [
      row.id,
      frameworkLabel(row.framework),
      row.readiness,
      row.obligation,
      row.trigger,
      row.owner,
      row.reviewGate,
      row.evidenceRequired.join('; ')
    ].map(escapeMarkdownTableCell).join(' | '))
    .map(row => `| ${row} |`)
    .join('\n');
  const gaps = matrix.gaps.length > 0
    ? matrix.gaps.map(row => `- [${row.readiness}] ${row.id}: ${row.evidenceRequired.join('; ')}`).join('\n')
    : '- None.';

  return [
    `# Regulatory Obligation Matrix: ${matrix.matterName}`,
    '',
    `- Schema Type: ${matrix.schemaType}`,
    `- Generated At: ${matrix.generatedAt}`,
    `- Risk Level: ${matrix.risk.level}`,
    `- Review Gate: ${matrix.actionPlan.reviewGate}`,
    '',
    '## Matrix',
    '',
    '| ID | Framework | Readiness | Obligation | Trigger | Owner | Review Gate | Evidence Required |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    rows,
    '',
    '## Gaps',
    '',
    gaps,
    '',
    '## Human Review Notice',
    '',
    matrix.humanReviewNotice
  ].join('\n');
}

function buildRows(typeKey: string, data: LegalMatterData): RowDraft[] {
  return [
    ...commonRows(data),
    ...aiActRows(data),
    ...gdprRows(data),
    ...doraRows(data),
    ...dataActRows(data),
    ...craRows(data),
    ...owaspGenAiRows(data),
    ...typeSpecificRows(typeKey, data)
  ];
}

function commonRows(data: LegalMatterData): RowDraft[] {
  return [
    {
      id: 'internal.source_payload',
      framework: 'internal_policy',
      obligation: 'Validated source payload and accountable owner',
      trigger: 'Every legal ops matter entering review',
      sourceFields: ['owner', 'businessOwner', 'requestOwner'],
      requiredFields: [],
      evidenceRequired: ['Source payload, schema validation result, named business owner, and intake timestamp.'],
      owner: 'Legal Operations',
      reviewGate: 'Matter intake review',
      rationale: 'Reviewer-grade workflows need source provenance before legal or compliance routing.'
    },
    {
      id: 'internal.review_gate',
      framework: 'internal_policy',
      obligation: 'Human review gate for consequential decisions',
      trigger: 'Risk score, missing evidence, final matter status, or customer-facing commitment',
      sourceFields: ['requiredApprovals', 'currentStatus', 'nonStandardTerms'],
      evidenceRequired: ['Reviewer note, transition history, and approval owner for every final decision.'],
      owner: 'General Counsel',
      reviewGate: 'GC or delegated reviewer approval',
      readiness: 'needs_review',
      rationale: 'Automation supports triage. Final approval requires recorded human judgment.'
    }
  ];
}

function aiActRows(data: LegalMatterData): RowDraft[] {
  const aiApplies = hasAiSignal(data);
  return [
    {
      id: 'ai_act.role_classification',
      framework: 'eu_ai_act',
      obligation: 'AI Act role classification',
      trigger: 'AI system, AI vendor, model provider, or AI-enabled product workflow',
      sourceFields: ['aiFeatures', 'aiFeaturesInvolved', 'tool', 'vendor', 'feature'],
      requiredFields: [],
      appliesWhen: () => aiApplies,
      reviewWhen: () => aiApplies,
      evidenceRequired: ['Role memo covering provider, deployer, importer, distributor, product manufacturer, and GPAI dependency position.'],
      owner: 'AI Governance Owner',
      reviewGate: 'Legal and product review',
      rationale: 'Obligations depend on the actor role and deployment context.'
    },
    {
      id: 'ai_act.prohibited_practices',
      framework: 'eu_ai_act',
      obligation: 'Prohibited practices screening',
      trigger: 'AI use case affects users, customers, employees, or regulated decisions',
      sourceFields: ['useCase', 'aiFeatures', 'prohibitedUse'],
      requiredFields: ['useCase'],
      appliesWhen: () => aiApplies,
      reviewWhen: payload => hasArrayValue(payload.prohibitedUse),
      evidenceRequired: ['Screening against prohibited practices, excluded uses, and customer-facing guardrails.'],
      owner: 'Legal Counsel',
      reviewGate: 'AI governance review',
      rationale: 'High-impact AI use cases need early exclusion screening before deployment.'
    },
    {
      id: 'ai_act.annex_iii_screening',
      framework: 'eu_ai_act',
      obligation: 'High-risk Annex III screening',
      trigger: 'AI used in regulated sector, employment, credit, education, essential services, law enforcement, or safety-sensitive workflow',
      sourceFields: ['customerSegment', 'customerSector', 'regulatoryImpact', 'useCase'],
      requiredFields: ['regulatoryImpact'],
      appliesWhen: () => aiApplies,
      reviewWhen: payload => textContainsKeywords(joinFields(payload, ['customerSegment', 'customerSector', 'regulatoryImpact', 'useCase']), ['finance', 'healthcare', 'credit', 'employment', 'education', 'essential', 'regulated', 'high-risk']),
      evidenceRequired: ['Annex III screening memo with intended purpose, affected persons, sector, and reviewer conclusion.'],
      owner: 'Regulatory Counsel',
      reviewGate: 'Senior legal review',
      rationale: 'High-risk classification drives documentation, oversight, and conformity obligations.'
    },
    {
      id: 'ai_act.gpai_dependency',
      framework: 'eu_ai_act',
      obligation: 'GPAI dependency evidence',
      trigger: 'External model provider, foundation model, LLM API, or model gateway used in the workflow',
      sourceFields: ['modelOrVendorProvidersInvolved', 'vendor', 'tool', 'aiFeatures'],
      requiredFields: [],
      appliesWhen: () => aiApplies,
      reviewWhen: payload => hasAnyField(payload, ['modelOrVendorProvidersInvolved', 'vendor', 'tool']),
      evidenceRequired: ['Provider identity, model version or family, model-use restrictions, training-data position, and downstream documentation received.'],
      owner: 'Vendor Owner',
      reviewGate: 'Vendor and AI governance review',
      rationale: 'Downstream AI governance depends on traceable provider evidence.'
    },
    {
      id: 'ai_act.article_50_transparency',
      framework: 'eu_ai_act',
      obligation: 'Article 50 transparency and user notice evidence',
      trigger: 'Human interaction, synthetic content, customer-facing AI output, or public AI claim',
      sourceFields: ['outputUse', 'publicClaims', 'aiFeatures'],
      requiredFields: ['outputUse'],
      appliesWhen: () => aiApplies,
      reviewWhen: payload => hasArrayValue(payload.publicClaims) || textContainsKeywords(payload.outputUse, ['customer', 'public', 'user']),
      evidenceRequired: ['User notice wording, UI disclosure location, output labeling decision, and claims substantiation.'],
      owner: 'Product Counsel',
      reviewGate: 'Launch review',
      rationale: 'Transparency evidence should be available before customer-facing AI features ship.'
    },
    {
      id: 'ai_act.human_oversight_logging_quality',
      framework: 'eu_ai_act',
      obligation: 'Human oversight, logging, robustness, cybersecurity, accuracy, and technical documentation',
      trigger: 'AI feature is used in a business workflow or regulated customer environment',
      sourceFields: ['aiFeatures', 'securityMaterial', 'conditions'],
      requiredFields: [],
      appliesWhen: () => aiApplies,
      reviewWhen: () => aiApplies,
      evidenceRequired: ['Human oversight design, logging retention, accuracy validation, robustness checks, cybersecurity controls, and technical documentation index.'],
      owner: 'Product and Security Owners',
      reviewGate: 'Security, product, and legal review',
      rationale: 'Operational AI controls need documentary evidence aligned with the intended use.'
    }
  ];
}

function gdprRows(data: LegalMatterData): RowDraft[] {
  const privacyApplies = hasPrivacySignal(data);
  return [
    {
      id: 'gdpr.role_allocation',
      framework: 'gdpr',
      obligation: 'Controller, processor, or joint-controller role allocation',
      trigger: 'Personal data processing, DPA review, vendor review, or customer data workflow',
      sourceFields: ['role', 'productOrService', 'dataEntered'],
      requiredFields: [],
      appliesWhen: () => privacyApplies,
      reviewWhen: () => privacyApplies,
      evidenceRequired: ['Role allocation memo and DPA clause position.'],
      owner: 'Privacy Counsel',
      reviewGate: 'DPO sign-off where required',
      rationale: 'GDPR obligations and contract terms depend on role allocation.'
    },
    {
      id: 'gdpr.data_categories',
      framework: 'gdpr',
      obligation: 'Personal data and data-subject category map',
      trigger: 'Personal data categories, data entered into AI tool, workspace documents, logs, or support data',
      sourceFields: ['personalDataCategories', 'dataCategories', 'dataEntered', 'dataSubjects'],
      requiredFields: [],
      appliesWhen: () => privacyApplies,
      reviewWhen: payload => hasAnyField(payload, ['personalDataCategories', 'dataCategories', 'dataEntered']),
      evidenceRequired: ['Data category map, data-subject categories, processing purposes, and system locations.'],
      owner: 'Privacy Operations',
      reviewGate: 'Privacy review',
      rationale: 'A privacy review cannot be evidenced without a data map.'
    },
    {
      id: 'gdpr.special_category_data',
      framework: 'gdpr',
      obligation: 'Special category data screening',
      trigger: 'Special category data, health data, biometric data, sensitive employment or regulated customer data',
      sourceFields: ['specialCategoryData', 'dataInvolved', 'dataCategories'],
      requiredFields: [],
      appliesWhen: () => privacyApplies,
      reviewWhen: payload => hasArrayValue(payload.specialCategoryData) || textContainsKeywords(joinFields(payload, ['dataInvolved', 'dataCategories', 'personalDataCategories']), ['health', 'medical', 'biometric', 'patient']),
      evidenceRequired: ['Special category screening, Article 9 basis assessment where applicable, and restriction on unsupported uses.'],
      owner: 'DPO',
      reviewGate: 'DPO sign-off',
      rationale: 'Special category processing can change DPIA, transfer, and contractual requirements.'
    },
    {
      id: 'gdpr.dpia',
      framework: 'gdpr',
      obligation: 'DPIA trigger and outcome',
      trigger: 'High-risk processing, AI profiling, systematic monitoring, sensitive data, or regulated customer workflow',
      sourceFields: ['privacyImpact', 'riskLevel', 'customerSegment', 'regulatoryImpact'],
      requiredFields: [],
      appliesWhen: () => privacyApplies,
      reviewWhen: payload => textContainsKeywords(joinFields(payload, ['privacyImpact', 'riskLevel', 'customerSegment', 'regulatoryImpact']), ['dpia', 'high', 'regulated', 'sensitive', 'profiling']),
      evidenceRequired: ['DPIA screening, DPIA decision, residual risk decision, and mitigation owner.'],
      owner: 'DPO',
      reviewGate: 'DPO sign-off',
      rationale: 'DPIA evidence should be explicit when high-risk privacy triggers appear.'
    },
    {
      id: 'gdpr.transfer_tia',
      framework: 'gdpr',
      obligation: 'Transfer mechanism and TIA evidence',
      trigger: 'Non-EEA provider, US model provider, support access, or non-EU hosting location',
      sourceFields: ['transferLocations', 'subprocessors', 'commitment'],
      requiredFields: [],
      appliesWhen: () => privacyApplies,
      reviewWhen: payload => textContainsKeywords(joinFields(payload, ['transferLocations', 'subprocessors', 'commitment']), ['us', 'united states', 'non-eu', 'third country']),
      evidenceRequired: ['Transfer mechanism, TIA, supplementary measures, support access scope, and data boundary commitments.'],
      owner: 'Privacy Counsel',
      reviewGate: 'DPO sign-off',
      rationale: 'International transfers require traceable contract and risk evidence.'
    },
    {
      id: 'gdpr.retention_deletion_subprocessors_toms',
      framework: 'gdpr',
      obligation: 'Retention, deletion, subprocessor evidence, and TOMs/security annex',
      trigger: 'Customer data processing or vendor handling customer inputs, logs, or documents',
      sourceFields: ['retentionPeriod', 'retentionPosition', 'deletionProcess', 'subprocessors', 'securityAnnexStatus', 'securityMaterial'],
      requiredFields: [],
      appliesWhen: () => privacyApplies,
      reviewWhen: () => privacyApplies,
      evidenceRequired: ['Retention and deletion position, subprocessor list, TOMs, security annex, and customer objection process.'],
      owner: 'Privacy and Security Owners',
      reviewGate: 'Privacy and security review',
      rationale: 'The operational privacy position must match the DPA and vendor evidence.'
    }
  ];
}

function doraRows(data: LegalMatterData): RowDraft[] {
  const applies = hasDoraSignal(data);
  return [
    {
      id: 'dora.register_of_information',
      framework: 'dora',
      obligation: 'ICT third-party register-of-information fields',
      trigger: 'Financial customer, regulated customer, DORA impact, material outsourcing, or ICT provider commitment',
      sourceFields: ['customerSector', 'regulatedCustomer', 'modelOrVendorProvidersInvolved', 'subprocessors', 'operationalDependency'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Provider name, service description, function supported, entity using service, locations, dates, notice periods, and termination rights.'],
      owner: 'Vendor Management',
      reviewGate: 'DORA outsourcing review',
      rationale: 'Financial-sector customers need register-ready ICT third-party evidence.'
    },
    {
      id: 'dora.critical_function_materiality',
      framework: 'dora',
      obligation: 'Critical or important function flag and materiality assessment',
      trigger: 'ICT service supports regulated customer operations or resilience commitment',
      sourceFields: ['businessPosition', 'commitment', 'operationalDependency', 'regulatoryImpact'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Critical or important function assessment, materiality rationale, customer impact, and fallback owner.'],
      owner: 'Regulatory Counsel',
      reviewGate: 'Senior legal review',
      rationale: 'Material ICT dependencies need clear governance and exit analysis.'
    },
    {
      id: 'dora.provider_chain_locations',
      framework: 'dora',
      obligation: 'Provider, subcontractor chain, processing/storage locations, and concentration risk',
      trigger: 'Provider chain, model provider, hosting vendor, or outsourced ICT component',
      sourceFields: ['modelOrVendorProvidersInvolved', 'subprocessors', 'transferLocations'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Provider chain map, subcontractors, processing/storage locations, substitutability, and concentration-risk note.'],
      owner: 'Security and Vendor Owners',
      reviewGate: 'Vendor risk review',
      rationale: 'Operational resilience review needs dependency depth, locations, and concentration visibility.'
    },
    {
      id: 'dora.contract_exit_transition',
      framework: 'dora',
      obligation: 'Contractual arrangement, exit strategy, and transition support',
      trigger: 'Regulated customer contract, ICT service, data residency commitment, or resilience obligation',
      sourceFields: ['nonStandardTerms', 'exitStrategy', 'commitment', 'contractImpact'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: payload => !hasField(payload, 'exitStrategy') || textContainsKeywords(payload.exitStrategy, ['pending', 'incomplete', 'under development']),
      evidenceRequired: ['Contract clause map, notice and audit position, exit plan, transition assistance, data return/deletion, and termination support.'],
      owner: 'Commercial Legal',
      reviewGate: 'GC or senior legal review',
      rationale: 'Regulated customers expect exit, transition, and resilience terms to be operationally feasible.'
    }
  ];
}

function dataActRows(data: LegalMatterData): RowDraft[] {
  const applies = hasDataActSignal(data);
  return [
    {
      id: 'data_act.switching_parallel_use',
      framework: 'data_act',
      obligation: 'Switching, parallel use, and exit support for data-processing services',
      trigger: 'SaaS, cloud, hosting, customer workspace, retrieval, model gateway, or data-processing service',
      sourceFields: ['deploymentModel', 'contractImpact', 'commitment', 'productArea'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Switching support clauses, parallel-use limitations, exit timetable, transition assistance, and customer responsibilities.'],
      owner: 'Commercial Legal',
      reviewGate: 'Contract review',
      rationale: 'Data-processing service terms should support switching and exit evidence.'
    },
    {
      id: 'data_act.export_access_portability',
      framework: 'data_act',
      obligation: 'Export, access support, and data portability evidence',
      trigger: 'Customer data, workspace data, logs, embeddings, or product output need export or return',
      sourceFields: ['dataCategories', 'dataEntered', 'dataInvolved', 'commitment'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Export formats, access APIs or self-service export, metadata scope, support workflow, and deletion after export.'],
      owner: 'Product Owner',
      reviewGate: 'Product and legal review',
      rationale: 'Portability commitments need product evidence and contract alignment.'
    },
    {
      id: 'data_act.unfair_contract_terms',
      framework: 'data_act',
      obligation: 'Unfair-contract risk screening',
      trigger: 'Non-standard SaaS, data access, switching, unilateral change, or portability terms',
      sourceFields: ['nonStandardTerms', 'customerRequestedChanges', 'redFlags'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: payload => hasAnyField(payload, ['nonStandardTerms', 'customerRequestedChanges', 'redFlags']),
      evidenceRequired: ['Playbook review of unilateral change, liability, switching, data access, and customer lock-in provisions.'],
      owner: 'Commercial Legal',
      reviewGate: 'Senior legal review where material',
      rationale: 'Data and switching terms can create hidden enforceability and customer-trust risk.'
    }
  ];
}

function craRows(data: LegalMatterData): RowDraft[] {
  const applies = hasCraSignal(data);
  return [
    {
      id: 'cra.product_with_digital_elements',
      framework: 'cra',
      obligation: 'Product-with-digital-elements screening',
      trigger: 'Software, SDK, product launch, cloud-connected feature, or distributed digital component',
      sourceFields: ['feature', 'package', 'distributionModel', 'useCase'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['CRA applicability screening, product category, intended use, and release channel.'],
      owner: 'Product Counsel',
      reviewGate: 'Launch or release review',
      rationale: 'Software and digital product launches need an applicability screen before release.'
    },
    {
      id: 'cra.cybersecurity_vulnerability_support_docs',
      framework: 'cra',
      obligation: 'Cybersecurity risk assessment, vulnerability handling, support period, technical documentation, and user security instructions',
      trigger: 'Software component or product launch reaches customers or developers',
      sourceFields: ['securityMaterial', 'conditions', 'distributionModel', 'targetDate'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Cybersecurity risk assessment, vulnerability disclosure process, support period, SBOM or dependency evidence, technical documentation, and user security instructions.'],
      owner: 'Security Owner',
      reviewGate: 'Security and release review',
      rationale: 'Customer-facing software needs durable cybersecurity and vulnerability evidence.'
    }
  ];
}

function owaspGenAiRows(data: LegalMatterData): RowDraft[] {
  const applies = hasAiSignal(data);
  return [
    {
      id: 'owasp_genai.prompt_injection_sensitive_info',
      framework: 'owasp_genai',
      obligation: 'Prompt injection and sensitive information disclosure controls',
      trigger: 'AI tool receives prompts, customer documents, workspace data, or connector context',
      sourceFields: ['dataEntered', 'dataInvolved', 'aiFeatures'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Prompt-injection threat model, tool-output filtering, sensitive-data handling, retention controls, and incident escalation path.'],
      owner: 'Security Owner',
      reviewGate: 'AI security review',
      rationale: 'GenAI systems need prompt and data leakage controls before customer use.'
    },
    {
      id: 'owasp_genai.supply_chain_agency_prompt_leakage',
      framework: 'owasp_genai',
      obligation: 'AI supply chain, excessive agency, and system prompt leakage controls',
      trigger: 'External model provider, agents, tool execution, or system prompts',
      sourceFields: ['vendor', 'tool', 'aiFeatures', 'conditions'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Model/provider inventory, tool permission limits, approval gates for external actions, system prompt exposure review, and provider change process.'],
      owner: 'AI Platform Owner',
      reviewGate: 'Security and product review',
      rationale: 'Agentic workflows need authority limits, provider provenance, and prompt-protection evidence.'
    },
    {
      id: 'owasp_genai.vector_misinformation_consumption',
      framework: 'owasp_genai',
      obligation: 'Vector/embedding weakness, misinformation, and unbounded consumption controls',
      trigger: 'Retrieval, embeddings, customer-visible answers, summaries, or high-volume AI usage',
      sourceFields: ['useCase', 'outputUse', 'aiFeatures', 'publicClaims'],
      requiredFields: [],
      appliesWhen: () => applies,
      reviewWhen: () => applies,
      evidenceRequired: ['Retrieval quality checks, source attribution, hallucination handling, usage limits, rate limits, cost monitoring, and customer-facing disclaimers where needed.'],
      owner: 'Product and AI Platform Owners',
      reviewGate: 'Launch review',
      rationale: 'AI answer quality and consumption controls affect legal, security, and commercial risk.'
    }
  ];
}

function typeSpecificRows(typeKey: string, data: LegalMatterData): RowDraft[] {
  if (typeKey === 'opensourcereview') {
    return [
      {
        id: 'oss.licence_supply_chain',
        framework: 'internal_policy',
        obligation: 'Open-source licence, attribution, and software supply-chain review',
        trigger: 'Open-source component, modified package, SDK distribution, or customer-facing dependency',
        sourceFields: ['package', 'licence', 'distributionModel', 'modifiedOrUnmodified', 'linkedOrSeparateService'],
        requiredFields: ['package', 'licence', 'distributionModel'],
        evidenceRequired: ['Licence text, attribution requirements, modification status, distribution model, dependency path, and security owner.'],
        owner: 'Open-Source Review Owner',
        reviewGate: 'Legal and engineering review',
        rationale: 'OSS use can affect distribution, notice, reciprocity, security, and product obligations.'
      }
    ];
  }

  if (typeKey === 'customercommitment') {
    return [
      {
        id: 'commitment.operational_proof',
        framework: 'internal_policy',
        obligation: 'Customer commitment implementation proof',
        trigger: 'Customer-specific commitment, renewal risk, DORA or data boundary promise',
        sourceFields: ['commitment', 'sourceDocument', 'operationalDependency', 'requiredAction', 'currentStatus'],
        requiredFields: ['commitment', 'sourceDocument', 'operationalDependency', 'requiredAction'],
        reviewWhen: payload => textContainsKeywords(payload.currentStatus, ['at_risk', 'overdue', 'pending']),
        evidenceRequired: ['Source clause, owner, implementation proof, exception list, renewal impact, and next review date.'],
        owner: 'Commitment Owner',
        reviewGate: 'Customer success, legal, and product review',
        rationale: 'Customer-specific promises need operational proof before renewal or customer confirmation.'
      }
    ];
  }

  return [];
}

function finalizeRow(draft: RowDraft, data: LegalMatterData): RegulatoryObligationRow {
  const applies = draft.appliesWhen ? draft.appliesWhen(data) : true;
  const requiredFields = draft.requiredFields ?? draft.sourceFields;
  const missingRequired = requiredFields.filter(field => !hasField(data, field));
  let readiness: RegulatoryReadiness = draft.readiness ?? 'satisfied';

  if (!applies) {
    readiness = 'not_applicable';
  } else if (draft.missingWhen?.(data) || missingRequired.length > 0) {
    readiness = 'missing';
  } else if (draft.reviewWhen?.(data)) {
    readiness = 'needs_review';
  }

  return {
    id: draft.id,
    framework: draft.framework,
    obligation: draft.obligation,
    trigger: draft.trigger,
    sourceFields: draft.sourceFields,
    evidenceRequired: draft.evidenceRequired,
    owner: draft.owner,
    reviewGate: draft.reviewGate,
    readiness,
    rationale: draft.rationale
  };
}

function inferMatterName(typeKey: string, data: LegalMatterData): string {
  if (typeKey === 'saascontractintake') {
    return stringValue(data.customer, 'SaaS contract intake');
  }
  if (typeKey === 'dpatriage') {
    return stringValue(data.productOrService, 'DPA triage');
  }
  if (typeKey === 'aivendorreview') {
    return `${stringValue(data.vendor, 'AI vendor')} - ${stringValue(data.tool, 'tool review')}`;
  }
  if (typeKey === 'opensourcereview') {
    return stringValue(data.package, 'Open-source package');
  }
  if (typeKey === 'customercommitment') {
    return `${stringValue(data.customer, 'Customer')} commitment`;
  }
  if (typeKey === 'productlaunchintake') {
    return stringValue(data.feature, 'Product launch');
  }
  return 'Legal ops matter';
}

function hasAiSignal(data: LegalMatterData): boolean {
  return hasAnyField(data, ['aiFeatures', 'aiFeaturesInvolved', 'modelOrVendorProvidersInvolved'])
    || textContainsKeywords(joinFields(data, ['tool', 'useCase', 'feature', 'regulatoryImpact', 'commitment']), ['ai', 'llm', 'model', 'agent', 'embedding', 'prompt']);
}

function hasPrivacySignal(data: LegalMatterData): boolean {
  return hasAnyField(data, ['personalDataCategories', 'specialCategoryData', 'dataSubjects', 'dataEntered', 'dataInvolved', 'dataCategories', 'subprocessors', 'retentionPeriod', 'retentionPosition'])
    || textContainsKeywords(joinFields(data, ['privacyImpact', 'commitment', 'useCase']), ['personal data', 'privacy', 'dpa', 'processor', 'controller', 'workspace data', 'prompt']);
}

function hasDoraSignal(data: LegalMatterData): boolean {
  return data.regulatedCustomer === true
    || textContainsKeywords(joinFields(data, ['customerSector', 'customerSegment', 'regulatoryImpact', 'commitment', 'businessPosition', 'operationalDependency']), ['bank', 'banking', 'finance', 'financial', 'fintech', 'insurance', 'dora', 'ict', 'regulated']);
}

function hasDataActSignal(data: LegalMatterData): boolean {
  return hasAnyField(data, ['deploymentModel', 'contractImpact', 'dataCategories', 'dataEntered', 'dataInvolved'])
    || textContainsKeywords(joinFields(data, ['commitment', 'productArea', 'useCase', 'feature']), ['saas', 'cloud', 'workspace', 'data', 'export', 'portability', 'switching']);
}

function hasCraSignal(data: LegalMatterData): boolean {
  return hasAnyField(data, ['feature', 'package', 'distributionModel'])
    || textContainsKeywords(joinFields(data, ['useCase', 'tool', 'productArea']), ['software', 'sdk', 'api', 'agent', 'product', 'digital']);
}

function hasAnyField(data: LegalMatterData, fields: string[]): boolean {
  return fields.some(field => hasField(data, field));
}

function hasField(data: LegalMatterData, field: string): boolean {
  const value = data[field];
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  }
  return value !== undefined && value !== null;
}

function hasArrayValue(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function joinFields(data: LegalMatterData, fields: string[]): string {
  return fields
    .map(field => stringify(data[field]))
    .filter(value => value.length > 0)
    .join(' ');
}

function stringify(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(stringify).join(' ');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).map(stringify).join(' ');
  }
  return value === undefined || value === null ? '' : String(value);
}

function textContainsKeywords(value: unknown, keywords: string[]): boolean {
  const text = stringify(value).toLowerCase();
  return keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function frameworkLabel(framework: RegulatoryFramework): string {
  const labels: Record<RegulatoryFramework, string> = {
    eu_ai_act: 'EU AI Act',
    gdpr: 'GDPR',
    nist_ai_rmf: 'NIST AI RMF',
    iso_42001: 'ISO 42001',
    dora: 'DORA',
    internal_policy: 'Internal Policy',
    data_act: 'Data Act',
    cra: 'Cyber Resilience Act',
    owasp_genai: 'OWASP GenAI'
  };
  return labels[framework];
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
