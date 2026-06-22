import type { LegalActionPlan, RequiredReviewerRole, ReviewerRole } from './action-plan.js';

export type ApprovalRecordState = 'approved' | 'pending' | 'rejected';
export type ExportGateStatus = 'allowed' | 'blocked';

export interface ApprovalRecord {
  approval: string;
  role?: ReviewerRole;
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
  roleRequirements: RequiredReviewerRole[];
  approvedRoleRequirements: RequiredReviewerRole[];
  missingRoleRequirements: RequiredReviewerRole[];
  blockerReasons: string[];
  approvalRecords: ApprovalRecord[];
}

export function evaluateExportApprovalGate(
  actionPlan: LegalActionPlan,
  approvalRecords: ApprovalRecord[] = []
): ExportApprovalGate {
  const requiredApprovals = uniqueStrings(actionPlan.requiredApprovals);
  const roleRequirements = actionPlan.requiredReviewerRoles ?? [];
  const approvedApprovals = requiredApprovals.filter(approval =>
    hasApprovalState(approvalRecords, approval, 'approved', roleForApproval(roleRequirements, approval))
  );
  const rejectedApprovals = requiredApprovals.filter(approval =>
    hasApprovalState(approvalRecords, approval, 'rejected', roleForApproval(roleRequirements, approval))
  );
  const missingApprovals = requiredApprovals.filter(
    approval => !approvedApprovals.includes(approval) && !rejectedApprovals.includes(approval)
  );
  const approvedRoleRequirements = roleRequirements.filter(requirement =>
    hasApprovalState(approvalRecords, requirement.approval, 'approved', requirement.role)
  );
  const missingRoleRequirements = roleRequirements.filter(
    requirement =>
      !approvedRoleRequirements.some(approved => sameRequirement(approved, requirement))
      && !hasApprovalState(approvalRecords, requirement.approval, 'rejected', requirement.role)
  );
  const blockerReasons = [
    ...actionPlan.blockers,
    ...rejectedApprovals.map(approval => `Approval rejected: ${approval}`),
    ...missingApprovals.map(approval => `Approval missing: ${approval}`),
    ...missingRoleRequirements.map(
      requirement => `Reviewer role missing: ${requirement.label} for ${requirement.approval}`
    )
  ];
  const exportAllowed = blockerReasons.length === 0;

  return {
    status: exportAllowed ? 'allowed' : 'blocked',
    exportAllowed,
    requiredApprovals,
    approvedApprovals,
    missingApprovals,
    rejectedApprovals,
    roleRequirements,
    approvedRoleRequirements,
    missingRoleRequirements,
    blockerReasons,
    approvalRecords
  };
}

function hasApprovalState(
  records: ApprovalRecord[],
  approval: string,
  state: ApprovalRecordState,
  role?: ReviewerRole
): boolean {
  const expected = normalize(approval);
  return records.some(record =>
    normalize(record.approval) === expected
    && record.state === state
    && (!role || record.role === role)
  );
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

function roleForApproval(requirements: RequiredReviewerRole[], approval: string): ReviewerRole | undefined {
  return requirements.find(requirement => normalize(requirement.approval) === normalize(approval))?.role;
}

function sameRequirement(left: RequiredReviewerRole, right: RequiredReviewerRole): boolean {
  return normalize(left.approval) === normalize(right.approval) && left.role === right.role;
}
