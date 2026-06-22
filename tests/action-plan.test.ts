import { describe, expect, test } from 'vitest';
import { createLegalActionPlan } from '../src/action-plan.js';

describe('Legal Action Plan Generator', () => {
  test('returns a self-serve action plan for low-risk SaaS intake', () => {
    const result = createLegalActionPlan('SaaSContractIntake', {
      requestOwner: 'Bob',
      customer: 'Standard LLC',
      contractType: 'MSA',
      dealStage: 'Proposal',
      regulatedCustomer: false,
      dataCategories: ['user names', 'business emails'],
      aiFeaturesInvolved: []
    });

    expect(result.risk.level).toBe('low');
    expect(result.reviewGate).toBe('self-serve');
    expect(result.priority).toBe('routine');
    expect(result.blockers).toEqual([]);
    expect(result.requiredApprovals).toContain('Commercial Owner Approval');
    expect(result.nextAction).toContain('self-serve');
  });

  test('turns an escalated product launch into a GC review package', () => {
    const result = createLegalActionPlan('ProductLaunchIntake', {
      feature: 'AutoDraft Agent v2',
      owner: 'Sarah Jenkins',
      targetDate: '2026-06-30',
      customerSegment: 'Enterprise regulated markets',
      jurisdictions: ['US', 'EU', 'UK'],
      dataInvolved: ['user credentials', 'uploaded bank statements'],
      aiFeatures: ['Fine-tuned model on customer transcripts'],
      publicClaims: ['Produces zero hallucinations and is 100% accurate'],
      customerCommitmentsAffected: ['Apex Finance Germany-only processing restriction'],
      privacyImpact: 'Requires updated privacy notice.',
      contractImpact: 'Requires MSA update.',
      regulatoryImpact: 'High-risk assessment under the EU AI Act.',
      requiredApprovals: ['DPO Sign-off', 'VP Engineering Security']
    });

    expect(result.risk.level).toBe('escalate');
    expect(result.reviewGate).toBe('gc-review');
    expect(result.priority).toBe('blocked');
    expect(result.requiredApprovals).toEqual(
      expect.arrayContaining([
        'DPO Sign-off',
        'VP Engineering Security',
        'Product Owner Approval',
        'GC Approval',
        'Regulatory Counsel Review'
      ])
    );
    expect(result.requiredReviewerRoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ approval: 'DPO Sign-off', role: 'privacy' }),
        expect.objectContaining({ approval: 'Product Owner Approval', role: 'product' }),
        expect.objectContaining({ approval: 'GC Approval', role: 'gc' }),
        expect.objectContaining({ approval: 'Regulatory Counsel Review', role: 'regulatory_counsel' })
      ])
    );
    expect(result.blockers.some(blocker => blocker.includes('public claims'))).toBe(true);
    expect(result.followUps).toContain(
      'Request evidence for each public claim and hold publication until claims review is complete.'
    );
    expect(result.evidenceToCollect).toContain(
      'Claims substantiation file with test method, sample, owner, and approval record.'
    );
    expect(result.auditTrail).toContain('Automated output is triage support only. Human review is required for consequential legal decisions.');
  });

  test('adds AI vendor evidence and blockers when model training is detected', () => {
    const result = createLegalActionPlan('AIVendorReview', {
      vendor: 'FastAI',
      tool: 'Summary Bot',
      useCase: 'Meeting notes',
      businessOwner: 'Sarah',
      dataEntered: ['customer chats'],
      retentionPosition: 'Retained permanently for model improvement',
      trainingOnCustomerData: true,
      approvedUse: true
    });

    expect(result.risk.level).toBe('escalate');
    expect(result.requiredApprovals).toEqual(
      expect.arrayContaining(['Security Review', 'Privacy Review', 'Senior Legal Review', 'GC Approval'])
    );
    expect(result.blockers.length).toBeGreaterThanOrEqual(2);
    expect(result.followUps).toContain(
      'Obtain contractual evidence that customer inputs are excluded from provider model training.'
    );
    expect(result.evidenceToCollect).toContain(
      'Vendor terms proving customer inputs are excluded from base-model training.'
    );
  });

  test('routes copyleft dependency review to legal and engineering owners', () => {
    const result = createLegalActionPlan('OpenSourceReview', {
      package: 'agpl-helper',
      licence: 'AGPL-3.0',
      useCase: 'Client SDK support',
      distributionModel: 'Client-Side SDK',
      modifiedOrUnmodified: 'modified',
      linkedOrSeparateService: 'linked',
      attributionNeeded: true,
      copyleftConcern: true,
      approvalStatus: 'Escalated'
    });

    expect(result.risk.level).toBe('escalate');
    expect(result.requiredApprovals).toEqual(
      expect.arrayContaining(['Open-Source Legal Review', 'Engineering Owner Approval', 'GC Approval'])
    );
    expect(result.followUps).toContain(
      'Confirm whether the package is distributed, linked, modified, or used as a separate service.'
    );
    expect(result.evidenceToCollect).toContain('Licence compatibility analysis and engineering architecture note.');
  });
});
