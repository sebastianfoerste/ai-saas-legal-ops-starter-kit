import { describe, expect, test } from 'vitest';
import {
  createAiVendorDiligencePacket,
  renderAiVendorDiligenceMarkdown
} from '../src/ai-vendor-diligence.js';

describe('AI vendor diligence packet', () => {
  test('keeps vendor export blocked until evidence and approvals are complete', () => {
    const packet = createAiVendorDiligencePacket(
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
      { generatedAt: '2026-06-19T12:00:00.000Z' }
    );

    expect(packet.schemaType).toBe('AIVendorReview');
    expect(packet.vendorName).toBe('Synthetix AI Inc.');
    expect(packet.risk.level).toBe('escalate');
    expect(packet.evidencePack.readiness).toBe('blocked');
    expect(packet.approvalGate.exportAllowed).toBe(false);
    expect(packet.approvalGate.missingApprovals).toEqual(
      expect.arrayContaining(['Security Review', 'Privacy Review', 'Senior Legal Review', 'GC Approval'])
    );
    expect(packet.openItems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('customer inputs are excluded from base-model or public-model training'),
        expect.stringContaining('Approval missing: GC Approval')
      ])
    );

    const markdown = renderAiVendorDiligenceMarkdown(packet);
    expect(markdown).toContain('# AI Vendor Diligence Packet: Synthetix AI Inc.');
    expect(markdown).toContain('Export allowed: no');
    expect(markdown).toContain('## Reviewer Notice');
  });
});
