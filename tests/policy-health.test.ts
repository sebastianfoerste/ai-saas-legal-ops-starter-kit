import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateRisk,
  getPolicyHealth,
  loadPolicyRuleConfig
} from '../src/risk-scoring.js';
import { PACKAGE_NAME } from '../src/workflows.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
describe('Policy rule health', () => {
  test('loads the same custom rules from root and dashboard cwd', () => {
    const rootHealth = getPolicyHealth(repoRoot);
    const dashboardHealth = getPolicyHealth(path.join(repoRoot, 'dashboard'));

    expect(rootHealth.status).toBe('valid');
    expect(dashboardHealth.status).toBe('valid');
    expect(rootHealth.path).toBe(dashboardHealth.path);
    expect(rootHealth.loadedRules).toBeGreaterThan(0);

    const risk = calculateRisk('SaaSContractIntake', {
      customer: 'Policy Test',
      customerSector: 'custom_dora_test'
    }, { policyStartDir: path.join(repoRoot, 'dashboard') });
    expect(risk.level).toBe('escalate');
    expect(risk.reasons).toContain('Custom DORA sector test rule triggered escalation');
  });

  test('reports missing policy files explicitly without failing risk scoring', () => {
    const tempRoot = createTempPackageRoot();
    const loaded = loadPolicyRuleConfig(tempRoot);
    expect(loaded.health.status).toBe('missing');
    expect(loaded.rules).toHaveLength(0);

    const risk = calculateRisk('SaaSContractIntake', { customer: 'Standard', regulatedCustomer: false }, { policyStartDir: tempRoot });
    expect(risk.level).toBe('low');
  });

  test('reports invalid JSON and fails visibly during scoring', () => {
    const tempRoot = createTempPackageRoot();
    fs.mkdirSync(path.join(tempRoot, 'policies'));
    fs.writeFileSync(path.join(tempRoot, 'policies', 'rules.json'), '{ invalid json', 'utf8');

    const loaded = loadPolicyRuleConfig(tempRoot);
    expect(loaded.health.status).toBe('invalid_json');
    expect(loaded.health.errors[0]).toContain('Invalid JSON');

    expect(() => calculateRisk('SaaSContractIntake', {}, { policyStartDir: tempRoot })).toThrow('Policy rules failed health check');
  });

  test('reports unsupported operators as policy health failures', () => {
    const tempRoot = createTempPackageRoot();
    fs.mkdirSync(path.join(tempRoot, 'policies'));
    fs.writeFileSync(path.join(tempRoot, 'policies', 'rules.json'), JSON.stringify([
      {
        id: 'rule.bad_operator',
        name: 'Bad Operator',
        schemaTypes: ['*'],
        level: 'high',
        conditions: [{ field: 'customer', operator: 'regex', value: 'Bank' }],
        message: 'Bad operator'
      }
    ], null, 2), 'utf8');

    const loaded = loadPolicyRuleConfig(tempRoot);
    expect(loaded.health.status).toBe('unsupported_operator');
    expect(loaded.health.errors.join('\n')).toContain('operator is unsupported');
  });
});

function createTempPackageRoot(): string {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legal-ops-policy-'));
  fs.writeFileSync(
    path.join(tempRoot, 'package.json'),
    JSON.stringify({ name: PACKAGE_NAME, version: '0.0.0', type: 'module' }),
    'utf8'
  );
  return tempRoot;
}
