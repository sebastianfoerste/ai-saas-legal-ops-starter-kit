import { afterEach, describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  assertMatterCreationAllowed,
  deleteMatter,
  listMattersWithDiagnostics,
  loadMatter,
  saveMatter,
  type PersistedMatter
} from '../src/storage.js';

const createdIds = new Set<string>();

afterEach(() => {
  for (const id of createdIds) {
    try {
      deleteMatter(id);
    } catch {
      // Ignore cleanup failures for deliberately invalid IDs.
    }
  }
  createdIds.clear();
});

describe('Matter storage safety', () => {
  test('rejects unsafe matter IDs and path traversal attempts', () => {
    expect(() => saveMatter(createMatter('../escape'))).toThrow('Matter id must be 1-80 characters');
    expect(() => saveMatter(createMatter('bad/path'))).toThrow('Matter id must be 1-80 characters');
    expect(() => deleteMatter('../escape')).toThrow('Matter id must be 1-80 characters');
    expect(loadMatter('../escape')).toBeNull();
  });

  test('rejects unknown schema types before writing', () => {
    expect(() => saveMatter({
      ...createMatter('unknown-schema'),
      schemaType: 'UnknownSchema'
    })).toThrow('Unsupported schema type');
  });

  test('guards direct final-status matter creation through shared helper', () => {
    expect(() => assertMatterCreationAllowed('approved')).toThrow('Final states require a reviewer transition');
    expect(() => assertMatterCreationAllowed('rejected')).toThrow('Final states require a reviewer transition');
    expect(() => assertMatterCreationAllowed('draft')).not.toThrow();
    expect(() => assertMatterCreationAllowed('pending_review')).not.toThrow();
  });

  test('writes matters atomically and reloads the persisted shape', () => {
    const id = 'atomic-write-test';
    createdIds.add(id);
    const matter = createMatter(id);
    saveMatter(matter);

    const loaded = loadMatter(id);
    expect(loaded?.id).toBe(id);
    expect(loaded?.auditLog[0].notes).toBe('Initial draft');
  });

  test('skips invalid stored files with visible diagnostics', () => {
    const id = 'diagnostic-test';
    createdIds.add(id);
    saveMatter(createMatter(id));

    const storageDir = path.resolve(process.cwd(), '.storage', 'matters');
    const invalidPath = path.join(storageDir, 'invalid-shape.json');
    fs.writeFileSync(invalidPath, JSON.stringify({ id: 'invalid-shape', status: 'draft' }), 'utf8');
    try {
      const result = listMattersWithDiagnostics();
      expect(result.matters.some(matter => matter.id === id)).toBe(true);
      expect(result.matters.some(matter => matter.id === 'invalid-shape')).toBe(false);
      expect(result.diagnostics.some(diagnostic => diagnostic.reason.includes('Matter name'))).toBe(true);
    } finally {
      fs.unlinkSync(invalidPath);
    }
  });
});

function createMatter(id: string): PersistedMatter {
  return {
    id,
    name: 'Storage Safety Matter',
    schemaType: 'SaaSContractIntake',
    data: {
      customer: 'Storage Corp',
      requestOwner: 'Legal Ops',
      contractType: 'MSA',
      dealStage: 'Draft',
      requestedDeadline: '2026-06-30',
      regulatedCustomer: false,
      dataCategories: ['business email'],
      aiFeaturesInvolved: []
    },
    status: 'draft',
    auditLog: [
      {
        timestamp: '2026-06-08T10:00:00.000Z',
        action: 'Create matter',
        actor: 'Test',
        notes: 'Initial draft'
      }
    ]
  };
}
