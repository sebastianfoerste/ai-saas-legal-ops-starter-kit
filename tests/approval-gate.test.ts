import { describe, expect, test } from 'vitest';
import { createLegalActionPlan } from '../src/action-plan.js';
import { evaluateExportApprovalGate, type ApprovalRecord } from '../src/approval-gate.js';

const generatedAt = '2026-06-16T10:00:00.000Z';

describe('Export approval gate', () => {
  test('blocks product launch export until required approvals are present', () => {
    const plan = createLegalActionPlan('ProductLaunchIntake', {
      feature: 'Regulated Launch',
      owner: 'Product Counsel',
      targetDate: '2026-07-01',
      customerSegment: 'Enterprise regulated markets',
      jurisdictions: ['EU'],
      dataInvolved: ['workspace documents'],
      aiFeatures: ['Human-approved AI workflow agent'],
      publicClaims: [],
      privacyImpact: 'DPIA screening needed.',
      contractImpact: 'Customer commitments may need notice.',
      regulatoryImpact: 'EU AI Act and DORA review required.',
      requiredApprovals: ['DPO Sign-off', 'Security Review', 'Product Owner Approval']
    });

    const gate = evaluateExportApprovalGate(plan, [
      approval('DPO Sign-off', 'privacy'),
      approval('Product Owner Approval', 'product')
    ]);

    expect(gate.exportAllowed).toBe(false);
    expect(gate.status).toBe('blocked');
    expect(gate.missingApprovals).toContain('Security Review');
    expect(gate.missingRoleRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          approval: 'Security Review',
          role: 'security'
        })
      ])
    );
    expect(gate.blockerReasons).toContain('Approval missing: Security Review');
    expect(gate.blockerReasons).toContain('Reviewer role missing: Security for Security Review');
  });

  test('allows export only when all required approvals are approved and blockers are clear', () => {
    const plan = createLegalActionPlan('ProductLaunchIntake', {
      feature: 'Standard Help Widget',
      owner: 'Product Counsel',
      targetDate: '2026-07-01',
      customerSegment: 'SMB',
      jurisdictions: ['US'],
      dataInvolved: ['business contact data'],
      aiFeatures: [],
      publicClaims: [],
      privacyImpact: 'No material privacy change.',
      contractImpact: 'No contract change.',
      regulatoryImpact: 'No material regulatory impact.',
      requiredApprovals: ['Product Owner Approval']
    });

    const gate = evaluateExportApprovalGate(plan, [approval('Product Owner Approval', 'product')]);

    expect(plan.blockers).toEqual([]);
    expect(gate.exportAllowed).toBe(true);
    expect(gate.status).toBe('allowed');
    expect(gate.missingApprovals).toEqual([]);
    expect(gate.approvedRoleRequirements).toEqual([
      expect.objectContaining({
        approval: 'Product Owner Approval',
        role: 'product'
      })
    ]);
  });

  test('blocks approval records with the wrong reviewer role', () => {
    const plan = createLegalActionPlan('AIVendorReview', {
      vendor: 'Synthetic AI Vendor',
      dataEntered: ['customer support tickets'],
      retentionPosition: 'Vendor keeps logs for training review.',
      trainingOnCustomerData: true,
      requiredApprovals: ['Security Review', 'Privacy Review']
    });

    const gate = evaluateExportApprovalGate(plan, [
      approval('Security Review', 'privacy'),
      approval('Privacy Review', 'privacy')
    ]);

    expect(gate.exportAllowed).toBe(false);
    expect(gate.missingRoleRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          approval: 'Security Review',
          role: 'security'
        })
      ])
    );
    expect(gate.blockerReasons).toContain('Reviewer role missing: Security for Security Review');
  });
});

function approval(name: string, role: ApprovalRecord['role']): ApprovalRecord {
  return {
    approval: name,
    role,
    state: 'approved',
    reviewer: 'Synthetic Reviewer',
    note: 'Approved for synthetic demo review.',
    timestamp: generatedAt
  };
}
