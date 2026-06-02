import { describe, expect, test } from 'vitest';
import { createLegalRiskRegister } from '../src/risk-register.js';

describe('Legal Risk Register Summary', () => {
  test('aggregates risk levels, review gates, blockers, and approvals across matters', () => {
    const register = createLegalRiskRegister(
      [
        {
          id: 'matter-001',
          name: 'Acme Health MSA',
          schemaType: 'SaaSContractIntake',
          owner: 'Alice Chen',
          data: {
            requestedDeadline: '2026-06-15',
            customer: 'Acme Health Systems',
            customerSector: 'Healthcare',
            regulatedCustomer: true,
            dataCategories: ['patient records', 'medical history'],
            aiFeaturesInvolved: ['Medical Coding Assistant']
          }
        },
        {
          id: 'matter-002',
          name: 'AutoDraft Agent v2 Launch',
          schemaType: 'ProductLaunchIntake',
          owner: 'Sarah Jenkins',
          data: {
            feature: 'AutoDraft Agent v2',
            owner: 'Sarah Jenkins',
            targetDate: '2026-05-15',
            customerSegment: 'Enterprise regulated markets',
            jurisdictions: ['EU'],
            dataInvolved: ['user credentials'],
            aiFeatures: ['Fine-tuned model on customer transcripts'],
            publicClaims: ['Produces zero hallucinations and is 100% accurate'],
            customerCommitmentsAffected: ['Apex Finance Germany-only processing restriction'],
            privacyImpact: 'Requires updated privacy notice.',
            contractImpact: 'Requires MSA update.',
            regulatoryImpact: 'High-risk assessment under the EU AI Act.',
            requiredApprovals: ['DPO Sign-off']
          }
        },
        {
          id: 'matter-003',
          name: 'Standard CRM Renewal',
          schemaType: 'SaaSContractIntake',
          owner: 'Bob Stone',
          data: {
            requestedDeadline: '2026-07-01',
            customer: 'Standard LLC',
            regulatedCustomer: false,
            dataCategories: ['business emails'],
            aiFeaturesInvolved: []
          }
        }
      ],
      {
        generatedAt: '2026-06-02T10:00:00.000Z',
        today: '2026-06-02',
        dueSoonDays: 30
      }
    );

    expect(register.totalMatters).toBe(3);
    expect(register.countsByRisk.escalate).toBe(2);
    expect(register.countsByRisk.low).toBe(1);
    expect(register.countsByReviewGate['gc-review']).toBe(2);
    expect(register.countsByReviewGate['self-serve']).toBe(1);
    expect(register.humanReviewRequired).toBe(true);

    expect(register.materialMatters.map(matter => matter.id)).toEqual(['matter-001', 'matter-002']);
    expect(register.overdueMatters.map(matter => matter.id)).toEqual(['matter-002']);
    expect(register.matters.find(matter => matter.id === 'matter-001')?.dueSoon).toBe(true);
    expect(register.matters.find(matter => matter.id === 'matter-002')?.overdue).toBe(true);
    expect(register.matters.find(matter => matter.id === 'matter-003')?.status).toBe('self-serve');

    expect(register.approvalQueue[0]).toMatchObject({
      approval: 'DPO Sign-off',
      count: 2,
      highestRisk: 'escalate'
    });
    expect(register.topBlockers.some(blocker => blocker.includes('public claims'))).toBe(true);
    expect(register.executiveSummary).toContain('3 matters reviewed');
    expect(register.executiveSummary).toContain('1 matter is overdue');
    expect(register.recommendedActions).toEqual(
      expect.arrayContaining([
        'Route 2 escalated matters to GC review before approval, launch, or customer commitment.',
        'Clear 1 overdue matter or reset the accountable review date.'
      ])
    );
  });

  test('returns a routine summary when all matters are self-serve', () => {
    const register = createLegalRiskRegister(
      [
        {
          id: 'matter-004',
          name: 'Standard Analytics Addendum',
          schemaType: 'SaaSContractIntake',
          data: {
            requestedDeadline: '2026-06-20',
            customer: 'PlainCo',
            regulatedCustomer: false,
            dataCategories: ['business emails'],
            aiFeaturesInvolved: []
          }
        }
      ],
      {
        generatedAt: '2026-06-02T10:00:00.000Z',
        today: '2026-06-02'
      }
    );

    expect(register.countsByRisk.low).toBe(1);
    expect(register.countsByReviewGate['self-serve']).toBe(1);
    expect(register.approvalQueue).toEqual([]);
    expect(register.topBlockers).toEqual([]);
    expect(register.materialMatters).toEqual([]);
    expect(register.humanReviewRequired).toBe(false);
    expect(register.recommendedActions).toContain(
      'Keep 1 low-friction matter in the self-serve playbook with audit logging.'
    );
  });
});
