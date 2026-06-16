import type { LegalActionPlan } from './action-plan.js';

export type ApprovalRecordState = 'approved' | 'pending' | 'rejected';
export type ExportGateStatus = 'allowed' | 'blocked';

export interface ApprovalRecord {
  approval: string;
  state: ApprovalRecordState;
  reviewer: string;
  note: string;
  timestamp: string;
}

export interface ExportApprovalGate {
  status: ExportGateStatus;
  exportAllowed: boolean;
  requiredApprovals: string[];
  approvedApprovals: string[];
  missingApprovals: string[];
  rejectedApprovals: string[];
  blockerReasons: string[];
  approvalRecords: ApprovalRecord[];
}

export function evaluateExportApprovalGate(
  actionPlan: LegalActionPlan,
  approvalRecords: ApprovalRecord[] = []
): ExportApprovalGate {
  const requiredApprovals = uniqueStrings(actionPlan.requiredApprovals);
  const approvedApprovals = requiredApprovals.filter(approval =>
    hasApprovalState(approvalRecords, approval, 'approved')
  );
  const rejectedApprovals = requiredApprovals.filter(approval =>
    hasApprovalState(approvalRecords, approval, 'rejected')
  );
  const missingApprovals = requiredApprovals.filter(
    approval => !approvedApprovals.includes(approval) && !rejectedApprovals.includes(approval)
  );
  const blockerReasons = [
    ...actionPlan.blockers,
    ...rejectedApprovals.map(approval => `Approval rejected: ${approval}`),
    ...missingApprovals.map(approval => `Approval missing: ${approval}`)
  ];
  const exportAllowed = blockerReasons.length === 0;

  return {
    status: exportAllowed ? 'allowed' : 'blocked',
    exportAllowed,
    requiredApprovals,
    approvedApprovals,
    missingApprovals,
    rejectedApprovals,
    blockerReasons,
    approvalRecords
  };
}

function hasApprovalState(
  records: ApprovalRecord[],
  approval: string,
  state: ApprovalRecordState
): boolean {
  const expected = normalize(approval);
  return records.some(record => normalize(record.approval) === expected && record.state === state);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = normalize(trimmed);
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
