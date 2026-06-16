import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  createDecisionPacket,
  createIntegrityManifest,
  renderDecisionPacketMarkdown
} from '../src/decision-packet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const generatedAt = '2026-06-08T10:00:00.000Z';

describe('Decision packets and integrity manifests', () => {
  test('creates a reviewer-grade packet with deterministic SHA-256 sections', () => {
    const packet = createDecisionPacket({
      schemaType: 'SaaSContractIntake',
      name: 'Packet Test Matter',
      data: readExample('saas-contract-intake.example.json'),
      reviewerNote: 'Approved for demo export with legal review pending.',
      generatedAt
    }, { startDir: repoRoot });

    expect(packet.sourcePayload.customer).toBe('Atlas Metrics Bank');
    expect(packet.validation.valid).toBe(true);
    expect(packet.risk.reasons.length).toBeGreaterThan(0);
    expect(packet.actionPlan.reviewGate).toBe('gc-review');
    expect(packet.evidencePack.items.length).toBeGreaterThan(0);
    expect(packet.regulatoryMatrix.rows.length).toBeGreaterThan(0);
    expect(packet.contractPlaybook?.deviations.length).toBeGreaterThan(0);
    expect(packet.approvalGate.exportAllowed).toBe(false);
    expect(packet.approvalGate.missingApprovals).toContain('GC Approval');
    expect(packet.integrityManifest.algorithm).toBe('sha256');
    expect(packet.integrityManifest.sections.map(section => section.section)).toEqual(expect.arrayContaining([
      'sourcePayload',
      'validation',
      'risk',
      'actionPlan',
      'evidencePack',
      'regulatoryMatrix',
      'contractPlaybook',
      'approvalGate',
      'reviewerNote',
      'transitionHistory',
      'humanReviewNotice'
    ]));
    expect(packet.integrityManifest.overallDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(createIntegrityManifest(packet).overallDigest).toBe(packet.integrityManifest.overallDigest);
  });

  test('renders decision packet Markdown with manifest evidence', () => {
    const packet = createDecisionPacket({
      schemaType: 'AIVendorReview',
      data: readExample('ai-vendor-review.example.json'),
      generatedAt
    }, { startDir: repoRoot });
    const markdown = renderDecisionPacketMarkdown(packet);

    expect(markdown).toContain('# Decision Packet:');
    expect(markdown).toContain('## Source Payload');
    expect(markdown).toContain('## Approval Gate');
    expect(markdown).toContain('Export Allowed: false');
    expect(markdown).toContain('## Integrity Manifest');
    expect(markdown).toContain(packet.integrityManifest.overallDigest);
  });
});

function readExample(filename: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples', filename), 'utf8'));
}
