import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  saveMatter,
  loadMatter,
  listMatters,
  deleteMatter,
  transitionMatterStatus,
  PersistedMatter
} from '../src/storage.js';
import { calculateRisk } from '../src/risk-scoring.js';

describe('Legal Ops Persistence and State Machine Tests', () => {
  const testMatterId = 'test-matter-999';

  beforeAll(() => {
    // Ensure clean state
    deleteMatter(testMatterId);
  });

  afterAll(() => {
    // Cleanup
    deleteMatter(testMatterId);
  });

  test('should save, load, and list matters persistently', () => {
    const matter: PersistedMatter = {
      id: testMatterId,
      name: 'Test Matter',
      schemaType: 'SaaSContractIntake',
      data: {
        customer: 'Test Persistence Corp',
        requestOwner: 'Tester',
        contractType: 'MSA',
        dealStage: 'Negotiation',
        requestedDeadline: '2026-06-30',
        regulatedCustomer: false,
        dataCategories: ['emails'],
        aiFeaturesInvolved: []
      },
      status: 'draft',
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'Create matter',
          actor: 'Alice',
          notes: 'Initial draft'
        }
      ]
    };

    saveMatter(matter);

    const loaded = loadMatter(testMatterId);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('Test Matter');
    expect(loaded?.status).toBe('draft');
    expect(loaded?.auditLog).toHaveLength(1);

    const list = listMatters();
    expect(list.some(m => m.id === testMatterId)).toBe(true);
  });

  test('should transition status and log transitions in audit trail', () => {
    const updated = transitionMatterStatus(testMatterId, 'pending_review', 'Bob (GC)', 'Submitting for GC signoff');
    expect(updated.status).toBe('pending_review');
    expect(updated.auditLog).toHaveLength(2);
    expect(updated.auditLog[1].action).toBe('Transition status to pending_review');
    expect(updated.auditLog[1].actor).toBe('Bob (GC)');
    expect(updated.auditLog[1].notes).toBe('Submitting for GC signoff');
  });

  test('should require General Counsel role for final decisions', () => {
    expect(() =>
      transitionMatterStatus(testMatterId, 'approved', 'Privacy Reviewer', 'Looks acceptable', 'DPO Reviewer')
    ).toThrow('Only the General Counsel role may approve or reject a matter');

    const updated = transitionMatterStatus(
      testMatterId,
      'approved',
      'General Counsel',
      'Approved with recorded evidence limitations',
      'General Counsel'
    );

    expect(updated.status).toBe('approved');
    expect(updated.auditLog[updated.auditLog.length - 1].actor).toBe('General Counsel');
  });

  test('should reject unsupported matter status transitions', () => {
    const matterId = 'test-matter-status-guard';
    try {
      saveMatter({
        id: matterId,
        name: 'Status Guard Matter',
        schemaType: 'SaaSContractIntake',
        data: {
          customer: 'Status Guard Corp',
          requestOwner: 'Tester',
          contractType: 'MSA',
          dealStage: 'Negotiation',
          requestedDeadline: '2026-06-30',
          regulatedCustomer: false,
          dataCategories: ['emails'],
          aiFeaturesInvolved: []
        },
        status: 'draft',
        auditLog: [
          {
            timestamp: new Date().toISOString(),
            action: 'Create matter',
            actor: 'Alice',
            notes: 'Initial draft'
          }
        ]
      });

      expect(() =>
        transitionMatterStatus(
          matterId,
          'archived' as PersistedMatter['status'],
          'Legal Ops',
          'Unsupported status check'
        )
      ).toThrow('Unsupported matter status: archived');
    } finally {
      deleteMatter(matterId);
    }
  });

  test('should require a written review note for every status transition', () => {
    const matterId = 'test-matter-note-gate';
    try {
      saveMatter({
        id: matterId,
        name: 'Review Note Gate Matter',
        schemaType: 'SaaSContractIntake',
        data: {
          customer: 'Note Gate Corp',
          requestOwner: 'Tester',
          contractType: 'MSA',
          dealStage: 'Negotiation',
          requestedDeadline: '2026-06-30',
          regulatedCustomer: false,
          dataCategories: ['emails'],
          aiFeaturesInvolved: []
        },
        status: 'draft',
        auditLog: [
          {
            timestamp: new Date().toISOString(),
            action: 'Create matter',
            actor: 'Alice',
            notes: 'Initial draft'
          }
        ]
      });

      expect(() =>
        transitionMatterStatus(matterId, 'pending_review', 'Legal Ops', '   ')
      ).toThrow('Review notes are required for every status transition');
    } finally {
      deleteMatter(matterId);
    }
  });

  test('should dynamically load and evaluate rules from policies/rules.json', () => {
    // The policy file is populated with rule.custom_dora_test matching customerSector = 'custom_dora_test'
    const data = {
      customer: ' Swiss DORA Corp',
      requestOwner: 'Alice',
      contractType: 'MSA',
      dealStage: 'Proposal',
      requestedDeadline: '2026-06-30',
      regulatedCustomer: false,
      customerSector: 'custom_dora_test', // Triggers dynamic rule
      dataCategories: ['emails'],
      aiFeaturesInvolved: []
    };

    const result = calculateRisk('SaaSContractIntake', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons).toContain('Custom DORA sector test rule triggered escalation');
  });
});
