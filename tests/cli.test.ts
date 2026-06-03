import { describe, expect, test } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDemoReport,
  parseDemoCliArgs,
  renderDemoHelp,
  renderDemoReportMarkdown,
  runLegalOpsDemo
} from '../src/cli.js';
import { deleteMatter } from '../src/storage.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const generatedAt = '2026-06-02T10:00:00.000Z';

describe('Legal Ops Demo CLI', () => {
  test('parses default and explicit CLI options', () => {
    const defaults = parseDemoCliArgs(['node', 'cli'], repoRoot);
    expect(defaults.format).toBe('markdown');
    expect(defaults.schemasDir).toBe(path.join(repoRoot, 'schemas'));
    expect(defaults.examplesDir).toBe(path.join(repoRoot, 'examples'));

    const explicit = parseDemoCliArgs(
      ['node', 'cli', '--format', 'json', '--schemas-dir', 'schemas', '--examples-dir', 'examples', '--generated-at', generatedAt],
      repoRoot
    );
    expect(explicit).toMatchObject({
      format: 'json',
      generatedAt,
      schemasDir: path.join(repoRoot, 'schemas'),
      examplesDir: path.join(repoRoot, 'examples')
    });
  });

  test('builds a complete report from bundled schemas and examples', () => {
    const report = buildDemoReport({
      format: 'markdown',
      schemasDir: path.join(repoRoot, 'schemas'),
      examplesDir: path.join(repoRoot, 'examples'),
      generatedAt
    });

    expect(report.allExamplesValid).toBe(true);
    expect(report.matters).toHaveLength(6);
    expect(report.riskRegister.totalMatters).toBe(6);
    expect(report.matters.map(matter => matter.schemaType)).toEqual(
      expect.arrayContaining(['ProductLaunchIntake', 'AIVendorReview', 'DPATriage'])
    );
    expect(report.matters.find(matter => matter.schemaType === 'ProductLaunchIntake')?.evidencePack.readiness).toBe('blocked');
    expect(report.matters.find(matter => matter.schemaType === 'SaaSContractIntake')?.contractPlaybook?.deviations.length).toBeGreaterThan(0);
  });

  test('renders deterministic Markdown output', () => {
    const report = buildDemoReport({
      format: 'markdown',
      schemasDir: path.join(repoRoot, 'schemas'),
      examplesDir: path.join(repoRoot, 'examples'),
      generatedAt
    });
    const markdown = renderDemoReportMarkdown(report);

    expect(markdown).toContain('# AI SaaS Legal Ops Demo Report');
    expect(markdown).toContain('Examples Valid: 6/6');
    expect(markdown).toContain('## Matter Overview');
    expect(markdown).toContain('## Core Evidence Packs');
    expect(markdown).toContain('## Contract Playbook');
    expect(markdown).toBe(renderDemoReportMarkdown(report));
  });

  test('runs JSON output mode', () => {
    const output = runLegalOpsDemo(
      ['node', 'cli', '--format', 'json', '--generated-at', generatedAt],
      repoRoot
    );
    const parsed = JSON.parse(output);

    expect(parsed.generatedAt).toBe(generatedAt);
    expect(parsed.allExamplesValid).toBe(true);
    expect(parsed.riskRegister.totalMatters).toBe(6);
  });

  test('renders help text', () => {
    expect(renderDemoHelp()).toContain('legal-ops-demo [--format markdown|json]');
  });

  test('runs validate subcommand', () => {
    const output = runLegalOpsDemo(
      ['node', 'cli', 'validate', '--schema', 'schemas/dpa-triage.schema.json', '--input', 'examples/dpa-triage.example.json'],
      repoRoot
    );
    expect(output).toContain('Validation Result');
    expect(output).toContain('valid');
  });

  test('runs score subcommand', () => {
    const output = runLegalOpsDemo(
      ['node', 'cli', 'score', '--type', 'DPATriage', '--input', 'examples/dpa-triage.example.json'],
      repoRoot
    );
    expect(output).toContain('Risk Assessment: DPATriage');
    expect(output).toContain('Risk Level:** ESCALATE');
  });

  test('runs plan subcommand', () => {
    const output = runLegalOpsDemo(
      ['node', 'cli', 'plan', '--type', 'DPATriage', '--input', 'examples/dpa-triage.example.json'],
      repoRoot
    );
    expect(output).toContain('Legal Action Plan: DPATriage');
    expect(output).toContain('DPO Sign-off');
  });

  test('runs evidence subcommand', () => {
    const output = runLegalOpsDemo(
      ['node', 'cli', 'evidence', '--type', 'DPATriage', '--input', 'examples/dpa-triage.example.json'],
      repoRoot
    );
    expect(output).toContain('AI Governance Evidence Pack');
    expect(output).toContain('Triage');
  });

  test('runs register subcommand', () => {
    const output = runLegalOpsDemo(
      ['node', 'cli', 'register', 'examples/dpa-triage.example.json', 'examples/saas-contract-intake.example.json'],
      repoRoot
    );
    expect(output).toContain('Portfolio Legal Risk Register Summary');
    expect(output).toContain('Total Matters:** 2');
  });

  test('runs template subcommand', () => {
    const output = runLegalOpsDemo(
      ['node', 'cli', 'template', '--schema', 'schemas/dpa-triage.schema.json'],
      repoRoot
    );
    const parsed = JSON.parse(output);
    expect(parsed.schemaType).toBe('DPATriage');
    expect(parsed.role).toBe('[The role of the SaaS company under GDPR/CCPA for this processing activity.]');
  });

  test('runs save, list, show, and transition persistence subcommands via CLI', () => {
    const testId = 'cli-test-matter';
    const saveOutput = runLegalOpsDemo(
      [
        'node',
        'cli',
        'save',
        '--id',
        testId,
        '--name',
        'CLI Test Matter',
        '--type',
        'DPATriage',
        '--input',
        'examples/dpa-triage.example.json',
        '--status',
        'draft',
        '--actor',
        'CLI Test Actor',
        '--notes',
        'Ingested via test'
      ],
      repoRoot
    );
    expect(saveOutput).toContain('CLI Test Matter');
    expect(saveOutput).toContain('cli-test-matter');
    expect(saveOutput).toContain('saved successfully');

    const listOutput = runLegalOpsDemo(['node', 'cli', 'list'], repoRoot);
    expect(listOutput).toContain('cli-test-matter');
    expect(listOutput).toContain('CLI Test Matter');

    const showOutput = runLegalOpsDemo(['node', 'cli', 'show', '--id', testId], repoRoot);
    expect(showOutput).toContain('Matter: CLI Test Matter');
    expect(showOutput).toContain('Current Status:** draft');
    expect(showOutput).toContain('Ingested matter with initial status draft');

    const transitionOutput = runLegalOpsDemo(
      [
        'node',
        'cli',
        'transition',
        '--id',
        testId,
        '--status',
        'pending_review',
        '--actor',
        'Reviewer Bot',
        '--notes',
        'Promoting to review status'
      ],
      repoRoot
    );
    expect(transitionOutput).toContain('updated to **pending_review**');

    // Verify it is updated in show output
    const showOutputUpdated = runLegalOpsDemo(['node', 'cli', 'show', '--id', testId], repoRoot);
    expect(showOutputUpdated).toContain('Current Status:** pending_review');
    expect(showOutputUpdated).toContain('Transition status to pending_review');
    expect(showOutputUpdated).toContain('Reviewer Bot');

    // Clean up file manually to avoid test pollution
    deleteMatter(testId);
  });
});
