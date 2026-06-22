import {
  evaluateExportApprovalGate,
  type ApprovalRecord,
  type ExportApprovalGate
} from './approval-gate.js';
import {
  createLegalActionPlan,
  type LegalActionPlan,
  type LegalMatterData
} from './action-plan.js';
import {
  createEvidencePack,
  renderEvidencePackMarkdown,
  type EvidencePack
} from './evidence-pack.js';
import { calculateRisk, type RiskAssessment } from './risk-scoring.js';

export interface AiVendorDiligenceOptions {
  approvalRecords?: ApprovalRecord[];
  generatedAt?: string;
}

export interface AiVendorDiligencePacket {
  schemaType: 'AIVendorReview';
  vendorName: string;
  toolName: string;
  risk: RiskAssessment;
  actionPlan: LegalActionPlan;
  evidencePack: EvidencePack;
  approvalGate: ExportApprovalGate;
  openItems: string[];
  reviewerNotice: string;
}

const REVIEWER_NOTICE =
  'AI vendor diligence is triage support for supervised legal, privacy and security review. External use remains blocked until required approvals are recorded and blockers are resolved.';

export function createAiVendorDiligencePacket(
  data: LegalMatterData,
  options: AiVendorDiligenceOptions = {}
): AiVendorDiligencePacket {
  const risk = calculateRisk('AIVendorReview', data);
  const actionPlan = createLegalActionPlan('AIVendorReview', data, { risk });
  const evidencePack = createEvidencePack('AIVendorReview', data, {
    actionPlan,
    generatedAt: options.generatedAt,
    risk
  });
  const approvalGate = evaluateExportApprovalGate(actionPlan, options.approvalRecords ?? []);

  return {
    schemaType: 'AIVendorReview',
    vendorName: stringField(data.vendor, 'Unknown vendor'),
    toolName: stringField(data.tool, 'Unknown tool'),
    risk,
    actionPlan,
    evidencePack,
    approvalGate,
    openItems: buildOpenItems(actionPlan, evidencePack, approvalGate),
    reviewerNotice: REVIEWER_NOTICE
  };
}

export function renderAiVendorDiligenceMarkdown(packet: AiVendorDiligencePacket): string {
  return [
    `# AI Vendor Diligence Packet: ${packet.vendorName}`,
    '',
    `Tool: ${packet.toolName}`,
    `Risk level: ${packet.risk.level}`,
    `Review gate: ${packet.actionPlan.reviewGate}`,
    `Export allowed: ${packet.approvalGate.exportAllowed ? 'yes' : 'no'}`,
    '',
    '## Open Items',
    '',
    numberedList(packet.openItems),
    '',
    '## Required Approvals',
    '',
    numberedList(packet.approvalGate.requiredApprovals),
    '',
    '## Evidence Pack',
    '',
    renderEvidencePackMarkdown(packet.evidencePack),
    '',
    '## Reviewer Notice',
    '',
    packet.reviewerNotice
  ].join('\n');
}

function buildOpenItems(
  actionPlan: LegalActionPlan,
  evidencePack: EvidencePack,
  approvalGate: ExportApprovalGate
): string[] {
  return uniqueStrings([
    ...actionPlan.blockers,
    ...evidencePack.missingEvidence.map(item => `${item.title}: ${item.evidenceRequired.join('; ')}`),
    ...approvalGate.missingApprovals.map(approval => `Approval missing: ${approval}`),
    ...approvalGate.rejectedApprovals.map(approval => `Approval rejected: ${approval}`)
  ]);
}

function stringField(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function numberedList(values: string[]): string {
  if (values.length === 0) {
    return '1. None.';
  }
  return values.map((value, index) => `${index + 1}. ${value}`).join('\n');
}
