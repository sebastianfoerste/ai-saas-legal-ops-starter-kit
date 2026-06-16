import { describe, expect, test } from 'vitest';
import {
  createContractPlaybookReview,
  renderContractPlaybookMarkdown
} from '../src/contract-playbook.js';

describe('Contract Playbook Review', () => {
  test('maps high-risk SaaS contract deviations to fallback positions and approvals', () => {
    const review = createContractPlaybookReview(
      {
        requestOwner: 'Alice Chen',
        customer: 'Acme Health Systems',
        contractType: 'MSA',
        dealStage: 'Negotiation',
        requestedDeadline: '2026-06-15',
        customerSector: 'Healthcare',
        regulatedCustomer: true,
        deploymentModel: 'Single-Tenant Dedicated',
        dataCategories: ['patient records', 'medical history', 'billing data'],
        aiFeaturesInvolved: ['Patient Notes Co-Pilot'],
        modelOrVendorProvidersInvolved: ['Google Gemini'],
        nonStandardTerms: [
          'Customer demands 10x liability cap for security breaches',
          'Model provider changes require 90 days notice'
        ],
        redFlags: ['Customer demands training opt-out verification audited by third-party weekly'],
        businessPosition: 'Strategic healthcare customer.',
        legalQuestion: 'Can we agree to a 10x liability cap for data breaches?'
      },
      { generatedAt: '2026-06-02T10:00:00.000Z' }
    );

    expect(review.customer).toBe('Acme Health Systems');
    expect(review.risk.level).toBe('escalate');
    expect(review.humanReviewRequired).toBe(true);
    expect(review.deviations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'liability.super_cap', severity: 'requires_approval' }),
        expect.objectContaining({ id: 'subprocessor.notice', severity: 'negotiable' }),
        expect.objectContaining({ id: 'audit.weekly_or_third_party', severity: 'requires_approval' }),
        expect.objectContaining({ id: 'ai.training', severity: 'requires_approval' }),
        expect.objectContaining({ id: 'customer.regulated_sector', severity: 'requires_approval' }),
        expect.objectContaining({ id: 'data.sensitive_categories', severity: 'requires_approval' })
      ])
    );
    expect(review.approvalRequired).toEqual(
      expect.arrayContaining([
        'GC Approval',
        'Senior Legal Review',
        'Finance Approval',
        'Security Review',
        'DPO Sign-off'
      ])
    );
    expect(review.negotiationSummary).toContain('Highest severity is requires_approval');
  });

  test('treats uncapped liability as a non-starter', () => {
    const review = createContractPlaybookReview({
      customer: 'MegaCorp',
      contractType: 'MSA',
      dealStage: 'LegalReview',
      regulatedCustomer: false,
      dataCategories: ['business emails'],
      aiFeaturesInvolved: [],
      nonStandardTerms: ['Customer requests uncapped liability for all losses']
    });

    expect(review.nonStarters).toHaveLength(1);
    expect(review.nonStarters[0]).toMatchObject({
      id: 'liability.uncapped',
      severity: 'nonstarter'
    });
    expect(review.reviewerNotes).toContain('Do not send fallback wording externally until GC has reviewed the non-starter item.');
  });

  test('requires approval for a nonstandard liability cap', () => {
    const review = createContractPlaybookReview({
      customer: 'Synthetic SaaS Buyer',
      contractType: 'MSA',
      dealStage: 'LegalReview',
      regulatedCustomer: false,
      dataCategories: ['business emails'],
      aiFeaturesInvolved: [],
      nonStandardTerms: ['Customer requests 10x liability cap for data breach claims']
    });

    expect(review.deviations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'liability.super_cap',
          severity: 'requires_approval',
          approvalRequired: expect.arrayContaining(['Senior Legal Review', 'Finance Approval'])
        })
      ])
    );
  });

  test('creates general review items for unmapped deviations', () => {
    const review = createContractPlaybookReview({
      customer: 'PlainCo',
      contractType: 'MSA',
      dealStage: 'Negotiation',
      regulatedCustomer: false,
      dataCategories: ['business emails'],
      aiFeaturesInvolved: [],
      nonStandardTerms: ['Customer requests unusual quarterly executive roadmap meetings']
    });

    expect(review.deviations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'general',
          severity: 'requires_approval',
          approvalRequired: ['Senior Legal Review']
        })
      ])
    );
  });

  test('returns standard path when no deviations are present', () => {
    const review = createContractPlaybookReview({
      customer: 'Standard LLC',
      contractType: 'MSA',
      dealStage: 'Proposal',
      regulatedCustomer: false,
      dataCategories: ['business emails'],
      aiFeaturesInvolved: []
    });

    expect(review.risk.level).toBe('low');
    expect(review.deviations).toEqual([]);
    expect(review.nonStarters).toEqual([]);
    expect(review.humanReviewRequired).toBe(false);
    expect(review.negotiationSummary).toBe('Standard LLC can proceed on the standard contract path. No clause deviations were detected.');
  });

  test('renders deterministic Markdown negotiation memo', () => {
    const review = createContractPlaybookReview(
      {
        customer: 'Acme Health Systems',
        contractType: 'MSA',
        dealStage: 'Negotiation',
        customerSector: 'Healthcare',
        regulatedCustomer: true,
        dataCategories: ['patient records'],
        aiFeaturesInvolved: ['Patient Notes Co-Pilot'],
        nonStandardTerms: ['Customer demands 10x liability cap for security breaches']
      },
      { generatedAt: '2026-06-02T10:00:00.000Z' }
    );
    const markdown = renderContractPlaybookMarkdown(review);

    expect(markdown).toContain('# Contract Playbook Review: Acme Health Systems');
    expect(markdown).toContain('## Clause Deviation Table');
    expect(markdown).toContain('liability.super_cap');
    expect(markdown).toBe(renderContractPlaybookMarkdown(review));
  });
});
