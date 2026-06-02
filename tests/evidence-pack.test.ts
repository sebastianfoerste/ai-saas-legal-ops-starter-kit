import { describe, expect, test } from 'vitest';
import { createEvidencePack, renderEvidencePackMarkdown } from '../src/evidence-pack.js';

describe('AI Governance Evidence Pack', () => {
  test('builds a blocked product-launch evidence pack for sensitive AI launch claims', () => {
    const pack = createEvidencePack(
      'ProductLaunchIntake',
      {
        feature: 'AutoDraft Agent v2',
        owner: 'Sarah Jenkins',
        targetDate: '2026-06-30',
        customerSegment: 'Enterprise regulated markets',
        jurisdictions: ['US', 'EU', 'UK'],
        dataInvolved: ['user credentials', 'uploaded bank statements'],
        aiFeatures: ['Fine-tuned model on customer transcripts'],
        publicClaims: ['Produces zero hallucinations and is 100% accurate'],
        customerCommitmentsAffected: ['Apex Finance Germany-only processing restriction'],
        privacyImpact: 'Requires updated privacy notice and consent check.',
        contractImpact: 'Requires updating MSA Exhibit A and DPA terms.',
        regulatoryImpact: 'High-risk assessment under the EU AI Act due to credit scoring implications.',
        requiredApprovals: ['DPO Sign-off']
      },
      { generatedAt: '2026-06-02T10:00:00.000Z' }
    );

    expect(pack.matterName).toBe('AutoDraft Agent v2');
    expect(pack.readiness).toBe('blocked');
    expect(pack.risk.level).toBe('escalate');
    expect(pack.humanReviewRequired).toBe(true);
    expect(new Set(pack.items.map(item => item.framework))).toEqual(
      new Set(['eu_ai_act', 'gdpr', 'internal_policy', 'iso_42001', 'nist_ai_rmf', 'dora'])
    );
    expect(pack.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'product.claims_substantiation',
          status: 'needs_review',
          priority: 'critical'
        }),
        expect.objectContaining({
          id: 'product.human_oversight',
          status: 'missing',
          priority: 'critical'
        })
      ])
    );

    const markdown = renderEvidencePackMarkdown(pack);
    expect(markdown).toContain('# AI Governance Evidence Pack: AutoDraft Agent v2');
    expect(markdown).toContain('## Evidence Checklist');
    expect(markdown).toContain('## Missing Evidence');
    expect(markdown).toContain('Public claims substantiation');
    expect(markdown).toContain('Human oversight design');
  });

  test('flags AI vendor model-training, security, and subprocessor evidence', () => {
    const pack = createEvidencePack(
      'AIVendorReview',
      {
        vendor: 'Synthetix AI Inc.',
        tool: 'TranslateMaster Pro',
        useCase: 'Translating customer contracts',
        businessOwner: 'Marcus Vance',
        dataEntered: ['customer agreements', 'personal identifiers'],
        outputUse: 'Uploaded to customer portals',
        retentionPosition: 'Indefinite retention of customer inputs for fine-tuning',
        trainingOnCustomerData: true,
        subprocessors: ['unverified third party host in non-EU country'],
        securityMaterial: ['Self-assessment questionnaire only'],
        approvedUse: false,
        prohibitedUse: ['Do not use with customer health data'],
        conditions: ['Require custom training opt-out agreement']
      },
      { generatedAt: '2026-06-02T10:00:00.000Z' }
    );

    expect(pack.readiness).toBe('blocked');
    expect(pack.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'vendor.model_training_opt_out',
          status: 'missing',
          priority: 'critical'
        }),
        expect.objectContaining({
          id: 'vendor.security_material',
          status: 'needs_review',
          priority: 'critical'
        }),
        expect.objectContaining({
          id: 'vendor.subprocessors',
          status: 'needs_review',
          priority: 'critical'
        }),
        expect.objectContaining({
          id: 'vendor.training_risk_review',
          status: 'missing',
          priority: 'critical'
        })
      ])
    );
    expect(pack.missingEvidence.map(item => item.id)).toEqual(
      expect.arrayContaining([
        'vendor.model_training_opt_out',
        'vendor.security_material',
        'vendor.subprocessors',
        'vendor.training_risk_review'
      ])
    );
  });

  test('builds DPA evidence for special category data and international transfers', () => {
    const pack = createEvidencePack(
      'DPATriage',
      {
        productOrService: 'StrategyOS Enterprise Agent',
        role: 'processor',
        dataSubjects: ['employees', 'end users'],
        personalDataCategories: ['names', 'email addresses', 'user prompt inputs'],
        specialCategoryData: ['health data', 'biometric data'],
        subprocessors: [
          { name: 'Pinecone Systems Inc.', location: 'US', purpose: 'Vector Search Hosting' }
        ],
        transferLocations: ['US', 'EU'],
        retentionPeriod: 'Indefinite or custom retention',
        deletionProcess: 'Delete customer data upon 90 days request',
        securityAnnexStatus: 'Custom Customer Requirements',
        missingFacts: ['Clarify whether subprocessor contracts contain SCCs']
      },
      { generatedAt: '2026-06-02T10:00:00.000Z' }
    );

    expect(pack.readiness).toBe('blocked');
    expect(pack.requiredApprovals).toEqual(expect.arrayContaining(['DPO Sign-off', 'GC Approval']));
    expect(pack.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'dpa.dpia_review', status: 'missing', priority: 'critical' }),
        expect.objectContaining({ id: 'dpa.transfer_locations', status: 'needs_review' }),
        expect.objectContaining({ id: 'dpa.subprocessors', status: 'needs_review' }),
        expect.objectContaining({ id: 'dpa.retention', status: 'needs_review' }),
        expect.objectContaining({ id: 'dpa.deletion', status: 'needs_review' }),
        expect.objectContaining({ id: 'dpa.missing_facts', status: 'missing' })
      ])
    );
  });

  test('keeps low-risk non-AI product launch ready and does not add DORA without a trigger', () => {
    const pack = createEvidencePack(
      'ProductLaunchIntake',
      {
        feature: 'Billing Label Update',
        owner: 'Nina Stone',
        targetDate: '2026-07-15',
        customerSegment: 'SMB',
        jurisdictions: ['US'],
        dataInvolved: ['business emails'],
        aiFeatures: [],
        publicClaims: [],
        privacyImpact: 'No material privacy impact.',
        contractImpact: 'No contract update required.',
        regulatoryImpact: 'None.'
      },
      { generatedAt: '2026-06-02T10:00:00.000Z' }
    );

    expect(pack.risk.level).toBe('low');
    expect(pack.readiness).toBe('ready');
    expect(pack.items.some(item => item.framework === 'dora')).toBe(false);
    expect(pack.missingEvidence).toEqual([]);
    expect(pack.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'product.ai_system_description', status: 'not_applicable' }),
        expect.objectContaining({ id: 'product.claims_substantiation', status: 'not_applicable' })
      ])
    );
  });

  test('renders deterministic Markdown for the same evidence pack', () => {
    const pack = createEvidencePack(
      'ProductLaunchIntake',
      {
        feature: 'Billing Label Update',
        owner: 'Nina Stone',
        targetDate: '2026-07-15',
        customerSegment: 'SMB',
        jurisdictions: ['US'],
        dataInvolved: ['business emails'],
        aiFeatures: [],
        publicClaims: [],
        privacyImpact: 'No material privacy impact.',
        contractImpact: 'No contract update required.',
        regulatoryImpact: 'None.'
      },
      { generatedAt: '2026-06-02T10:00:00.000Z' }
    );

    expect(renderEvidencePackMarkdown(pack)).toBe(renderEvidencePackMarkdown(pack));
  });
});
