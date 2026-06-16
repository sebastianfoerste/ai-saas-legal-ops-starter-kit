import { createHash } from 'crypto';
import {
  createLegalActionPlan,
  type LegalActionPlan,
  type LegalMatterData
} from './action-plan.js';
import {
  createContractPlaybookReview,
  type ContractPlaybookReview
} from './contract-playbook.js';
import { createEvidencePack, type EvidencePack } from './evidence-pack.js';
import {
  createRegulatoryObligationMatrix,
  type RegulatoryObligationMatrix
} from './regulatory-matrix.js';
import { calculateRisk, type RiskAssessment } from './risk-scoring.js';
import { type PersistedMatter } from './storage.js';
import { validateJSON, type ValidationResult } from './validate.js';
import { loadSchemaForType } from './workflows.js';
import {
  evaluateExportApprovalGate,
  type ApprovalRecord,
  type ExportApprovalGate
} from './approval-gate.js';

export interface DecisionPacketInput {
  schemaType?: string;
  name?: string;
  data?: LegalMatterData;
  matter?: PersistedMatter;
  validation?: ValidationResult;
  risk?: RiskAssessment;
  actionPlan?: LegalActionPlan;
  evidencePack?: EvidencePack;
  regulatoryMatrix?: RegulatoryObligationMatrix;
  contractPlaybook?: ContractPlaybookReview;
  approvalRecords?: ApprovalRecord[];
  reviewerNote?: string;
  generatedAt?: string;
}

export interface IntegrityManifestSection {
  section: string;
  digest: string;
}

export interface IntegrityManifest {
  algorithm: 'sha256';
  generatedAt: string;
  sections: IntegrityManifestSection[];
  overallDigest: string;
}

export interface DecisionPacket {
  schemaType: string;
  matterName: string;
  generatedAt: string;
  sourcePayload: LegalMatterData;
  validation: ValidationResult;
  risk: RiskAssessment;
  actionPlan: LegalActionPlan;
  evidencePack: EvidencePack;
  regulatoryMatrix: RegulatoryObligationMatrix;
  contractPlaybook?: ContractPlaybookReview;
  approvalGate: ExportApprovalGate;
  reviewerNote?: string;
  transitionHistory: PersistedMatter['auditLog'];
  humanReviewNotice: string;
  integrityManifest: IntegrityManifest;
}

type DecisionPacketWithoutManifest = Omit<DecisionPacket, 'integrityManifest'>;

const HUMAN_REVIEW_NOTICE = 'This packet is deterministic decision support for reviewer workflow evidence. It is not a legal opinion, external communication, regulatory filing, or final approval by itself.';

export function createDecisionPacket(input: DecisionPacketInput, options: { startDir?: string } = {}): DecisionPacket {
  const schemaType = input.schemaType ?? input.matter?.schemaType;
  const data = input.data ?? input.matter?.data;

  if (!schemaType) {
    throw new Error('Decision packet requires a schemaType or persisted matter');
  }
  if (!data) {
    throw new Error('Decision packet requires source payload data or persisted matter data');
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const validation = input.validation ?? validateJSON(loadSchemaForType(schemaType, options.startDir), data);
  const risk = input.risk ?? calculateRisk(schemaType, data);
  const actionPlan = input.actionPlan ?? createLegalActionPlan(schemaType, data, { risk });
  const evidencePack = input.evidencePack ?? createEvidencePack(schemaType, data, { generatedAt, risk, actionPlan });
  const regulatoryMatrix = input.regulatoryMatrix ?? createRegulatoryObligationMatrix(schemaType, data, { generatedAt, risk, actionPlan });
  const contractPlaybook = input.contractPlaybook
    ?? (schemaType === 'SaaSContractIntake' ? createContractPlaybookReview(data, { generatedAt, risk, actionPlan }) : undefined);
  const approvalGate = evaluateExportApprovalGate(
    actionPlan,
    input.approvalRecords ?? approvalRecordsFromPayload(data)
  );
  const basePacket: DecisionPacketWithoutManifest = {
    schemaType,
    matterName: input.name ?? input.matter?.name ?? regulatoryMatrix.matterName,
    generatedAt,
    sourcePayload: data,
    validation,
    risk,
    actionPlan,
    evidencePack,
    regulatoryMatrix,
    contractPlaybook,
    approvalGate,
    reviewerNote: input.reviewerNote,
    transitionHistory: input.matter?.auditLog ?? [],
    humanReviewNotice: HUMAN_REVIEW_NOTICE
  };

  return {
    ...basePacket,
    integrityManifest: createIntegrityManifest(basePacket)
  };
}

export function createIntegrityManifest(packet: DecisionPacket | DecisionPacketWithoutManifest): IntegrityManifest {
  const packetWithoutManifest = stripManifest(packet);
  const generatedAt = packetWithoutManifest.generatedAt;
  const sections = [
    sectionDigest('sourcePayload', packetWithoutManifest.sourcePayload),
    sectionDigest('validation', packetWithoutManifest.validation),
    sectionDigest('risk', packetWithoutManifest.risk),
    sectionDigest('actionPlan', packetWithoutManifest.actionPlan),
    sectionDigest('evidencePack', packetWithoutManifest.evidencePack),
    sectionDigest('regulatoryMatrix', packetWithoutManifest.regulatoryMatrix),
    sectionDigest('contractPlaybook', packetWithoutManifest.contractPlaybook ?? null),
    sectionDigest('approvalGate', packetWithoutManifest.approvalGate),
    sectionDigest('reviewerNote', packetWithoutManifest.reviewerNote ?? ''),
    sectionDigest('transitionHistory', packetWithoutManifest.transitionHistory),
    sectionDigest('humanReviewNotice', packetWithoutManifest.humanReviewNotice)
  ];

  return {
    algorithm: 'sha256',
    generatedAt,
    sections,
    overallDigest: sha256(stableStringify(sections))
  };
}

export function renderDecisionPacketMarkdown(packet: DecisionPacket): string {
  const validation = packet.validation.valid
    ? '- Payload is valid.'
    : (packet.validation.errors ?? ['Unknown validation error']).map(error => `- ${error}`).join('\n');
  const riskReasons = packet.risk.reasons.map(reason => `- ${reason}`).join('\n');
  const transitionHistory = packet.transitionHistory.length > 0
    ? packet.transitionHistory.map(entry => `- ${entry.timestamp}: ${entry.action} by ${entry.actor}. ${entry.notes}`).join('\n')
    : '- No status transitions recorded.';
  const gaps = packet.regulatoryMatrix.gaps.length > 0
    ? packet.regulatoryMatrix.gaps.map(row => `- [${row.readiness}] ${row.id}: ${row.evidenceRequired.join('; ')}`).join('\n')
    : '- None.';
  const approvalRows = packet.approvalGate.requiredApprovals.length > 0
    ? packet.approvalGate.requiredApprovals
      .map(approval => {
        if (packet.approvalGate.approvedApprovals.includes(approval)) {
          return `- approved: ${approval}`;
        }
        if (packet.approvalGate.rejectedApprovals.includes(approval)) {
          return `- rejected: ${approval}`;
        }
        return `- missing: ${approval}`;
      })
      .join('\n')
    : '- No approval records required by the deterministic action plan.';
  const playbook = packet.contractPlaybook
    ? [
      `- Deviations: ${packet.contractPlaybook.deviations.length}`,
      `- Non-starters: ${packet.contractPlaybook.nonStarters.length}`,
      packet.contractPlaybook.deviations.map(deviation => `- ${deviation.id}: ${deviation.issue}`).join('\n') || '- No deviations.'
    ].join('\n')
    : '- No contract playbook review generated for this schema type.';
  const manifestRows = packet.integrityManifest.sections
    .map(section => `| ${escapeMarkdownTableCell(section.section)} | ${section.digest} |`)
    .join('\n');

  return [
    `# Decision Packet: ${packet.matterName}`,
    '',
    `- Schema Type: ${packet.schemaType}`,
    `- Generated At: ${packet.generatedAt}`,
    `- Risk Level: ${packet.risk.level}`,
    `- Review Gate: ${packet.actionPlan.reviewGate}`,
    `- Export Status: ${packet.approvalGate.status}`,
    '',
    '## Source Payload',
    '',
    '```json',
    JSON.stringify(packet.sourcePayload, null, 2),
    '```',
    '',
    '## Validation Result',
    '',
    validation,
    '',
    '## Risk Reasons',
    '',
    riskReasons,
    '',
    '## Action Plan',
    '',
    `- Priority: ${packet.actionPlan.priority}`,
    `- Summary: ${packet.actionPlan.summary}`,
    `- Next Action: ${packet.actionPlan.nextAction}`,
    '',
    '## Evidence Pack',
    '',
    `- Readiness: ${packet.evidencePack.readiness}`,
    `- Missing Evidence: ${packet.evidencePack.missingEvidence.length}`,
    '',
    '## Regulatory Matrix Gaps',
    '',
    gaps,
    '',
    '## Approval Gate',
    '',
    `- Export Allowed: ${packet.approvalGate.exportAllowed}`,
    approvalRows,
    '',
    '### Approval Blockers',
    '',
    packet.approvalGate.blockerReasons.map(reason => `- ${reason}`).join('\n') || '- None.',
    '',
    '## Contract Playbook Deviations',
    '',
    playbook,
    '',
    '## Reviewer Note',
    '',
    packet.reviewerNote?.trim() ? packet.reviewerNote.trim() : '- No reviewer note supplied.',
    '',
    '## Transition History',
    '',
    transitionHistory,
    '',
    '## Integrity Manifest',
    '',
    '| Section | SHA-256 |',
    '| --- | --- |',
    manifestRows,
    '',
    `Overall Digest: ${packet.integrityManifest.overallDigest}`,
    '',
    '## Human Review Notice',
    '',
    packet.humanReviewNotice
  ].join('\n');
}

function sectionDigest(section: string, value: unknown): IntegrityManifestSection {
  return {
    section,
    digest: sha256(stableStringify(value))
  };
}

function stripManifest(packet: DecisionPacket | DecisionPacketWithoutManifest): DecisionPacketWithoutManifest {
  const candidate = packet as DecisionPacket;
  if (!candidate.integrityManifest) {
    return packet as DecisionPacketWithoutManifest;
  }
  const { integrityManifest: _ignored, ...rest } = candidate;
  return rest;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function approvalRecordsFromPayload(data: LegalMatterData): ApprovalRecord[] {
  const value = data.approvalRecords;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isApprovalRecord);
}

function isApprovalRecord(value: unknown): value is ApprovalRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.approval === 'string'
    && (record.state === 'approved' || record.state === 'pending' || record.state === 'rejected')
    && typeof record.reviewer === 'string'
    && typeof record.note === 'string'
    && typeof record.timestamp === 'string';
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
