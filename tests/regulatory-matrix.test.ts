import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRegulatoryObligationMatrix } from '../src/regulatory-matrix.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

describe('Regulatory obligation matrix', () => {
  test('covers AI Act, Data Act, CRA, DORA, GDPR, and OWASP for product launches', () => {
    const matrix = createRegulatoryObligationMatrix(
      'ProductLaunchIntake',
      readExample('product-launch-intake.example.json'),
      { generatedAt: '2026-06-08T10:00:00.000Z' }
    );

    expect(rowIds(matrix)).toEqual(expect.arrayContaining([
      'ai_act.role_classification',
      'ai_act.prohibited_practices',
      'ai_act.annex_iii_screening',
      'ai_act.gpai_dependency',
      'ai_act.article_50_transparency',
      'ai_act.human_oversight_logging_quality',
      'data_act.switching_parallel_use',
      'cra.product_with_digital_elements',
      'owasp_genai.prompt_injection_sensitive_info'
    ]));
    expect(matrix.gaps.length).toBeGreaterThan(0);
    expect(matrix.humanReviewRequired).toBe(true);
  });

  test.each([
    ['AIVendorReview', 'ai-vendor-review.example.json', ['gdpr.retention_deletion_subprocessors_toms', 'owasp_genai.supply_chain_agency_prompt_leakage']],
    ['DPATriage', 'dpa-triage.example.json', ['gdpr.role_allocation', 'gdpr.transfer_tia']],
    ['SaaSContractIntake', 'saas-contract-intake.example.json', ['dora.register_of_information', 'data_act.unfair_contract_terms']],
    ['OpenSourceReview', 'open-source-review.example.json', ['oss.licence_supply_chain', 'cra.product_with_digital_elements']],
    ['CustomerCommitment', 'customer-commitment.example.json', ['commitment.operational_proof', 'dora.contract_exit_transition']]
  ])('generates expected rows for %s', (schemaType, exampleFile, expectedRows) => {
    const matrix = createRegulatoryObligationMatrix(
      schemaType,
      readExample(exampleFile),
      { generatedAt: '2026-06-08T10:00:00.000Z' }
    );

    expect(rowIds(matrix)).toEqual(expect.arrayContaining(expectedRows));
    expect(matrix.rows.every(row => row.owner && row.reviewGate && row.evidenceRequired.length > 0)).toBe(true);
  });
});

function readExample(filename: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples', filename), 'utf8'));
}

function rowIds(matrix: ReturnType<typeof createRegulatoryObligationMatrix>): string[] {
  return matrix.rows.map(row => row.id);
}
