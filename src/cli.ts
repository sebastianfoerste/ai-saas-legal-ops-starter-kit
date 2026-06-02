#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createLegalActionPlan, type LegalActionPlan } from './action-plan.js';
import {
  createContractPlaybookReview,
  type ContractPlaybookReview
} from './contract-playbook.js';
import { createEvidencePack, renderEvidencePackMarkdown, type EvidencePack } from './evidence-pack.js';
import { createLegalRiskRegister, type LegalRiskRegisterSummary } from './risk-register.js';
import { calculateRisk, type RiskAssessment } from './risk-scoring.js';
import { validateJSON, type ValidationResult } from './validate.js';
import {
  saveMatter,
  loadMatter,
  listMatters,
  transitionMatterStatus,
  type PersistedMatter
} from './storage.js';

export type DemoOutputFormat = 'json' | 'markdown';

export interface DemoCliOptions {
  format: DemoOutputFormat;
  schemasDir: string;
  examplesDir: string;
  generatedAt: string;
}

export interface DemoMatterReport {
  id: string;
  name: string;
  schemaType: string;
  schemaPath: string;
  examplePath: string;
  validation: ValidationResult;
  risk: RiskAssessment;
  actionPlan: LegalActionPlan;
  evidencePack: EvidencePack;
  contractPlaybook?: ContractPlaybookReview;
}

export interface DemoReport {
  generatedAt: string;
  allExamplesValid: boolean;
  matters: DemoMatterReport[];
  riskRegister: LegalRiskRegisterSummary;
}

interface DemoWorkflow {
  id: string;
  name: string;
  prefix: string;
  schemaType: string;
}

const DEMO_WORKFLOWS: DemoWorkflow[] = [
  {
    id: 'saas-contract-intake',
    name: 'SaaS Contract Intake',
    prefix: 'saas-contract-intake',
    schemaType: 'SaaSContractIntake'
  },
  {
    id: 'dpa-triage',
    name: 'DPA Triage',
    prefix: 'dpa-triage',
    schemaType: 'DPATriage'
  },
  {
    id: 'ai-vendor-review',
    name: 'AI Vendor Review',
    prefix: 'ai-vendor-review',
    schemaType: 'AIVendorReview'
  },
  {
    id: 'open-source-review',
    name: 'Open-Source Review',
    prefix: 'open-source-review',
    schemaType: 'OpenSourceReview'
  },
  {
    id: 'customer-commitment',
    name: 'Customer Commitment',
    prefix: 'customer-commitment',
    schemaType: 'CustomerCommitment'
  },
  {
    id: 'product-launch-intake',
    name: 'Product Launch Intake',
    prefix: 'product-launch-intake',
    schemaType: 'ProductLaunchIntake'
  }
];

export function parseDemoCliArgs(argv: string[], cwd = process.cwd()): DemoCliOptions {
  const options: DemoCliOptions = {
    format: 'markdown',
    schemasDir: path.resolve(cwd, 'schemas'),
    examplesDir: path.resolve(cwd, 'examples'),
    generatedAt: new Date().toISOString()
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--help' || arg === '-h') {
      throw new DemoCliHelpRequested();
    }
    if (arg === '--format') {
      options.format = parseFormat(next);
      index += 1;
      continue;
    }
    if (arg === '--schemas-dir') {
      options.schemasDir = path.resolve(cwd, requireValue(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--examples-dir') {
      options.examplesDir = path.resolve(cwd, requireValue(arg, next));
      index += 1;
      continue;
    }
    if (arg === '--generated-at') {
      options.generatedAt = requireValue(arg, next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function buildDemoReport(options: DemoCliOptions): DemoReport {
  const matters = DEMO_WORKFLOWS.map(workflow => buildMatterReport(workflow, options));
  const riskRegister = createLegalRiskRegister(
    matters.map(matter => ({
      id: matter.id,
      name: matter.name,
      schemaType: matter.schemaType,
      data: readJSON(matter.examplePath) as Record<string, unknown>,
      plan: matter.actionPlan
    })),
    {
      generatedAt: options.generatedAt
    }
  );

  return {
    generatedAt: options.generatedAt,
    allExamplesValid: matters.every(matter => matter.validation.valid),
    matters,
    riskRegister
  };
}

export function renderDemoReportMarkdown(report: DemoReport): string {
  const validCount = report.matters.filter(matter => matter.validation.valid).length;
  const matterRows = report.matters
    .map(matter => [
      matter.name,
      matter.validation.valid ? 'valid' : 'invalid',
      matter.risk.level,
      matter.actionPlan.reviewGate,
      matter.evidencePack.readiness
    ].map(escapeMarkdownTableCell).join(' | '))
    .map(row => `| ${row} |`)
    .join('\n');
  const approvals = report.riskRegister.approvalQueue.length > 0
    ? report.riskRegister.approvalQueue
      .map(item => `- ${item.approval}: ${item.count} ${plural('matter', item.count)} (${item.highestRisk})`)
      .join('\n')
    : '- No approval queue items.';
  const blockers = report.riskRegister.topBlockers.length > 0
    ? report.riskRegister.topBlockers.map(blocker => `- ${blocker}`).join('\n')
    : '- No blockers identified.';
  const evidenceSummary = report.matters
    .filter(matter => ['ProductLaunchIntake', 'AIVendorReview', 'DPATriage'].includes(matter.schemaType))
    .map(matter => `- ${matter.name}: ${matter.evidencePack.readiness}, ${matter.evidencePack.missingEvidence.length} open evidence ${plural('item', matter.evidencePack.missingEvidence.length)}`)
    .join('\n');
  const contractPlaybookSummary = report.matters
    .filter(matter => matter.contractPlaybook)
    .map(matter => {
      const playbook = matter.contractPlaybook as ContractPlaybookReview;
      return `- ${matter.name}: ${playbook.deviations.length} deviations, ${playbook.nonStarters.length} non-starters`;
    })
    .join('\n');

  return [
    '# AI SaaS Legal Ops Demo Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Examples Valid: ${validCount}/${report.matters.length}`,
    `- Portfolio Summary: ${report.riskRegister.executiveSummary}`,
    '',
    '## Matter Overview',
    '',
    '| Workflow | Validation | Risk | Review Gate | Evidence Readiness |',
    '| --- | --- | --- | --- | --- |',
    matterRows,
    '',
    '## Approval Queue',
    '',
    approvals,
    '',
    '## Top Blockers',
    '',
    blockers,
    '',
    '## Core Evidence Packs',
    '',
    evidenceSummary || '- No core AI, product, or privacy evidence packs generated.',
    '',
    '## Contract Playbook',
    '',
    contractPlaybookSummary || '- No SaaS contract playbook review generated.',
    '',
    '## Human Review Notice',
    '',
    'This report is deterministic triage support only. It does not produce legal advice, final approvals, contract decisions, regulatory filings, or public communications.'
  ].join('\n');
}

export function runLegalOpsDemo(argv: string[], cwd = process.cwd()): string {
  const subcommand = argv[2];
  const validSubcommands = [
    'validate',
    'score',
    'plan',
    'evidence',
    'register',
    'template',
    'save',
    'show',
    'list',
    'transition'
  ];
  
  if (subcommand && validSubcommands.includes(subcommand)) {
    return runSubcommand(argv, cwd);
  }

  const options = parseDemoCliArgs(argv, cwd);
  const report = buildDemoReport(options);

  if (options.format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  return renderDemoReportMarkdown(report);
}

export function renderDemoHelp(): string {
  return [
    'AI SaaS Legal Ops Starter Kit Demo CLI',
    '',
    'Usage:',
    '  legal-ops-demo [--format markdown|json] [--schemas-dir path] [--examples-dir path] [--generated-at ISO]',
    '  legal-ops-demo <subcommand> [options]',
    '',
    'Subcommands:',
    '  validate   Validates a target JSON payload against a JSON schema.',
    '  score      Scores the legal risk of a target JSON payload.',
    '  plan       Generates a Legal Action Plan from a target JSON payload.',
    '  evidence   Generates an AI Governance Evidence Pack from a target JSON payload.',
    '  register   Compiles multiple matter payloads into a portfolio Risk Register.',
    '  template   Generates a boilerplate JSON payload populated with defaults from a schema.',
    '  save       Saves/ingests a new matter into persistence.',
    '  show       Loads and shows details of a saved matter.',
    '  list       Lists all saved matters from persistence.',
    '  transition Transitions the status of a saved matter.',
    '',
    'Run "legal-ops-demo <subcommand> --help" for help on a specific subcommand.',
    '',
    'Options:',
    '  --format       Output format. Defaults to markdown.',
    '  --schemas-dir  Directory containing *.schema.json files. Defaults to ./schemas.',
    '  --examples-dir Directory containing *.example.json files. Defaults to ./examples.',
    '  --generated-at Fixed timestamp for deterministic reports.',
    '  --help         Show this help text.'
  ].join('\n');
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith('--')) {
        result[key] = val;
        i++;
      } else {
        result[key] = 'true';
      }
    } else {
      result[`_pos_${i}`] = args[i];
    }
  }
  return result;
}

function inferSchemaTypeFromPayload(data: any): string | null {
  if (data.schemaType) return String(data.schemaType);
  if (data.contractType && data.requestOwner) return 'SaaSContractIntake';
  if (data.personalDataCategories && data.role) return 'DPATriage';
  if (data.tool && data.vendor) return 'AIVendorReview';
  if (data.distributionModel && data.licence) return 'OpenSourceReview';
  if (data.commitment && data.sourceDocument) return 'CustomerCommitment';
  if (data.feature && data.targetDate) return 'ProductLaunchIntake';
  return null;
}

function renderSubcommandHelp(subcommand: string): string {
  switch (subcommand) {
    case 'validate':
      return [
        'Command: validate',
        'Validates a target JSON payload against a JSON schema.',
        '',
        'Usage:',
        '  legal-ops-demo validate --schema <schema-path> --input <input-path> [--format json|markdown]',
        '',
        'Options:',
        '  --schema  Path to the JSON schema file.',
        '  --input   Path to the JSON payload to validate.',
        '  --format  Output format: json or markdown (default).'
      ].join('\n');
    case 'score':
      return [
        'Command: score',
        'Scores the legal risk of a target JSON payload.',
        '',
        'Usage:',
        '  legal-ops-demo score --type <schema-type> --input <input-path> [--format json|markdown]',
        '',
        'Options:',
        '  --type    The type name of the schema (e.g. SaaSContractIntake, AIVendorReview).',
        '  --input   Path to the JSON payload.',
        '  --format  Output format: json or markdown (default).'
      ].join('\n');
    case 'plan':
      return [
        'Command: plan',
        'Generates a Legal Action Plan from a target JSON payload.',
        '',
        'Usage:',
        '  legal-ops-demo plan --type <schema-type> --input <input-path> [--format json|markdown]',
        '',
        'Options:',
        '  --type    The type name of the schema.',
        '  --input   Path to the JSON payload.',
        '  --format  Output format: json or markdown (default).'
      ].join('\n');
    case 'evidence':
      return [
        'Command: evidence',
        'Generates an AI Governance Evidence Pack from a target JSON payload.',
        '',
        'Usage:',
        '  legal-ops-demo evidence --type <schema-type> --input <input-path> [--format json|markdown]',
        '',
        'Options:',
        '  --type    The type name of the schema.',
        '  --input   Path to the JSON payload.',
        '  --format  Output format: json or markdown (default).'
      ].join('\n');
    case 'register':
      return [
        'Command: register',
        'Compiles multiple matter payloads into a portfolio Risk Register.',
        '',
        'Usage:',
        '  legal-ops-demo register <file1.json> <file2.json> ... [--format json|markdown]',
        '  legal-ops-demo register --inputs <comma-separated-paths> [--format json|markdown]',
        '',
        'Options:',
        '  --inputs  A comma-separated list of paths (files or directories) to compile.',
        '  --format  Output format: json or markdown (default).'
      ].join('\n');
    case 'template':
      return [
        'Command: template',
        'Generates a boilerplate JSON payload populated with defaults from a schema.',
        '',
        'Usage:',
        '  legal-ops-demo template --schema <schema-path> [--output <output-path>]',
        '',
        'Options:',
        '  --schema  Path to the JSON schema file.',
        '  --output  Optional path to write the generated JSON template file.'
      ].join('\n');
    case 'save':
      return [
        'Command: save',
        'Saves/ingests a new matter into persistence.',
        '',
        'Usage:',
        '  legal-ops-demo save --id <id> --name <name> --type <schema-type> --input <input-path> [--status draft|pending_review|approved|rejected] [--actor <actor>] [--notes <notes>] [--format json|markdown]',
        '',
        'Options:',
        '  --id      Unique identifier for the matter.',
        '  --name    Descriptive name of the matter.',
        '  --type    Schema type (e.g. SaaSContractIntake, AIVendorReview).',
        '  --input   Path to the JSON payload representing the matter data.',
        '  --status  Initial status: draft (default), pending_review, approved, rejected.',
        '  --actor   Actor name for audit trail logging.',
        '  --notes   Audit notes for the ingestion step.'
      ].join('\n');
    case 'show':
      return [
        'Command: show',
        'Loads and shows details of a saved matter.',
        '',
        'Usage:',
        '  legal-ops-demo show --id <id> [--format json|markdown]',
        '',
        'Options:',
        '  --id      Unique identifier of the matter.'
      ].join('\n');
    case 'list':
      return [
        'Command: list',
        'Lists all saved matters from persistence.',
        '',
        'Usage:',
        '  legal-ops-demo list [--format json|markdown]'
      ].join('\n');
    case 'transition':
      return [
        'Command: transition',
        'Transitions the status of a saved matter.',
        '',
        'Usage:',
        '  legal-ops-demo transition --id <id> --status <status> --actor <actor> --notes <notes> [--format json|markdown]',
        '',
        'Options:',
        '  --id      Unique identifier of the matter.',
        '  --status  Target status: draft, pending_review, approved, rejected.',
        '  --actor   Actor name transitioning the status.',
        '  --notes   Justification/audit notes for status transition.'
      ].join('\n');
    default:
      return renderDemoHelp();
  }
}

export function runSubcommand(argv: string[], cwd = process.cwd()): string {
  const subcommand = argv[2];
  const subArgs = parseArgs(argv.slice(3));
  const format = subArgs['format'] === 'json' ? 'json' : 'markdown';

  if (subArgs['help'] || subArgs['h']) {
    return renderSubcommandHelp(subcommand);
  }

  switch (subcommand) {
    case 'validate': {
      const schemaPath = subArgs['schema'];
      const inputPath = subArgs['input'];
      if (!schemaPath || !inputPath) {
        throw new Error('Usage: legal-ops-demo validate --schema <path> --input <path>');
      }
      const resolvedSchema = path.resolve(cwd, schemaPath);
      const resolvedInput = path.resolve(cwd, inputPath);
      const schema = JSON.parse(fs.readFileSync(resolvedSchema, 'utf8'));
      const data = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
      const validation = validateJSON(schema, data);
      
      if (format === 'json') {
        return JSON.stringify(validation, null, 2);
      }
      
      if (validation.valid) {
        return `### Validation Result\n\n✅ Payload is valid against schema **${schema.title || 'unnamed'}**.\n`;
      } else {
        return `### Validation Result\n\n❌ Payload is invalid against schema **${schema.title || 'unnamed'}**.\n\n**Errors:**\n${validation.errors?.map(err => `- ${err}`).join('\n')}\n`;
      }
    }
    case 'score': {
      const type = subArgs['type'];
      const inputPath = subArgs['input'];
      if (!type || !inputPath) {
        throw new Error('Usage: legal-ops-demo score --type <type> --input <path>');
      }
      const resolvedInput = path.resolve(cwd, inputPath);
      const data = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
      const risk = calculateRisk(type, data);
      
      if (format === 'json') {
        return JSON.stringify(risk, null, 2);
      }
      
      return [
        `# Risk Assessment: ${type}`,
        `**Risk Level:** ${risk.level.toUpperCase()}`,
        `### Reasons:`,
        risk.reasons.map(r => `- ${r}`).join('\n')
      ].join('\n\n');
    }
    case 'plan': {
      const type = subArgs['type'];
      const inputPath = subArgs['input'];
      if (!type || !inputPath) {
        throw new Error('Usage: legal-ops-demo plan --type <type> --input <path>');
      }
      const resolvedInput = path.resolve(cwd, inputPath);
      const data = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
      const plan = createLegalActionPlan(type, data);
      
      if (format === 'json') {
        return JSON.stringify(plan, null, 2);
      }
      
      return [
        `# Legal Action Plan: ${type}`,
        `- **Risk Level:** ${plan.risk.level}`,
        `- **Review Gate:** ${plan.reviewGate}`,
        `- **Priority:** ${plan.priority}`,
        `### Summary`,
        plan.summary,
        `### Next Action`,
        plan.nextAction,
        `### Required Approvals`,
        plan.requiredApprovals.map(a => `- ${a}`).join('\n') || 'None.',
        `### Blockers`,
        plan.blockers.map(b => `- ${b}`).join('\n') || 'None.',
        `### Follow-Ups`,
        plan.followUps.map(f => `- ${f}`).join('\n') || 'None.',
        `### Evidence to Collect`,
        plan.evidenceToCollect.map(e => `- ${e}`).join('\n') || 'None.'
      ].join('\n\n');
    }
    case 'evidence': {
      const type = subArgs['type'];
      const inputPath = subArgs['input'];
      if (!type || !inputPath) {
        throw new Error('Usage: legal-ops-demo evidence --type <type> --input <path>');
      }
      const resolvedInput = path.resolve(cwd, inputPath);
      const data = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
      const pack = createEvidencePack(type, data);
      
      if (format === 'json') {
        return JSON.stringify(pack, null, 2);
      }
      
      return renderEvidencePackMarkdown(pack);
    }
    case 'register': {
      const inputPaths: string[] = [];
      if (subArgs['inputs']) {
        subArgs['inputs'].split(',').forEach(p => inputPaths.push(p.trim()));
      }
      Object.keys(subArgs).forEach(k => {
        if (k.startsWith('_pos_')) {
          const val = subArgs[k];
          if (val !== 'register') {
            inputPaths.push(val);
          }
        }
      });

      if (inputPaths.length === 0) {
        throw new Error('Usage: legal-ops-demo register <file1.json> <file2.json> ...');
      }

      const inputs = inputPaths.flatMap(inputPath => {
        const resolved = path.resolve(cwd, inputPath);
        const stats = fs.statSync(resolved);
        if (stats.isDirectory()) {
          return fs.readdirSync(resolved)
            .filter(f => f.endsWith('.json') && !f.endsWith('.schema.json'))
            .map(f => path.join(inputPath, f));
        }
        return [inputPath];
      }).map((inputPath, idx) => {
        const resolved = path.resolve(cwd, inputPath);
        const data = JSON.parse(fs.readFileSync(resolved, 'utf8')) as Record<string, unknown>;
        const inferredType = inferSchemaTypeFromPayload(data);
        if (!inferredType) {
          throw new Error(`Could not infer schema type for file: ${inputPath}. Please set a "schemaType" field in the JSON.`);
        }
        return {
          id: `matter-${idx + 1}`,
          name: path.basename(inputPath, '.json'),
          schemaType: inferredType,
          data
        };
      });

      const register = createLegalRiskRegister(inputs);
      if (format === 'json') {
        return JSON.stringify(register, null, 2);
      }

      const matterRows = register.matters
        .map(m => [
          m.name,
          m.schemaType,
          m.plan.risk.level,
          m.plan.reviewGate,
          m.overdue ? 'overdue' : m.dueSoon ? 'due soon' : 'active'
        ].join(' | '))
        .map(row => `| ${row} |`)
        .join('\n');

      return [
        `# Portfolio Legal Risk Register Summary`,
        `- **Total Matters:** ${register.totalMatters}`,
        `- **Executive Summary:** ${register.executiveSummary}`,
        `## Matters Overview`,
        `| Matter Name | Schema Type | Risk Level | Review Gate | Status |`,
        `| --- | --- | --- | --- | --- |`,
        matterRows,
        `## Top Blockers`,
        register.topBlockers.map(b => `- ${b}`).join('\n') || 'None.',
        `## Recommended Actions`,
        register.recommendedActions.map(a => `- ${a}`).join('\n') || 'None.'
      ].join('\n\n');
    }
    case 'template': {
      const schemaPath = subArgs['schema'];
      if (!schemaPath) {
        throw new Error('Usage: legal-ops-demo template --schema <path> [--output <path>]');
      }
      const resolvedSchema = path.resolve(cwd, schemaPath);
      const schema = JSON.parse(fs.readFileSync(resolvedSchema, 'utf8'));
      
      const templateObj: Record<string, any> = {};
      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          const prop = value as any;
          if (prop.type === 'string') {
            if (prop.format === 'date') {
              templateObj[key] = new Date().toISOString().slice(0, 10);
            } else {
              templateObj[key] = `[${prop.description || key}]`;
            }
          } else if (prop.type === 'boolean') {
            templateObj[key] = false;
          } else if (prop.type === 'array') {
            templateObj[key] = [];
          } else if (prop.type === 'number' || prop.type === 'integer') {
            templateObj[key] = 0;
          } else {
            templateObj[key] = null;
          }
        }
      }
      
      if (schema.title) {
        templateObj['schemaType'] = schema.title;
      }

      const jsonStr = JSON.stringify(templateObj, null, 2);
      const outputPath = subArgs['output'];
      if (outputPath) {
        fs.writeFileSync(path.resolve(cwd, outputPath), jsonStr, 'utf8');
        return `✅ Template successfully written to **${outputPath}**.\n`;
      }
      return jsonStr;
    }
    case 'save': {
      const id = subArgs['id'];
      const name = subArgs['name'];
      const type = subArgs['type'];
      const inputPath = subArgs['input'];
      if (!id || !name || !type || !inputPath) {
        throw new Error('Usage: legal-ops-demo save --id <id> --name <name> --type <type> --input <path> [--status <status>] [--actor <actor>] [--notes <notes>]');
      }
      const resolvedInput = path.resolve(cwd, inputPath);
      const data = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
      const status = (subArgs['status'] as any) || 'draft';
      const actor = subArgs['actor'] || 'CLI User';
      const notes = subArgs['notes'] || 'Saved via CLI';
      const matter: PersistedMatter = {
        id,
        name,
        schemaType: type,
        data,
        status,
        auditLog: [
          {
            timestamp: new Date().toISOString(),
            action: `Ingested matter with initial status ${status}`,
            actor,
            notes
          }
        ]
      };
      saveMatter(matter);
      if (format === 'json') {
        return JSON.stringify({ success: true, matter }, null, 2);
      }
      return `✅ Matter **${name}** (ID: **${id}**) saved successfully under persistence.\n`;
    }
    case 'show': {
      const id = subArgs['id'];
      if (!id) {
        throw new Error('Usage: legal-ops-demo show --id <id>');
      }
      const matter = loadMatter(id);
      if (!matter) {
        throw new Error(`Matter with ID ${id} not found in persistence`);
      }
      if (format === 'json') {
        return JSON.stringify(matter, null, 2);
      }
      return [
        `# Matter: ${matter.name} (ID: ${matter.id})`,
        `- **Schema Type:** ${matter.schemaType}`,
        `- **Current Status:** ${matter.status}`,
        `### Audit Log:`,
        matter.auditLog.map(log => `- **[${log.timestamp}]** ${log.action} by *${log.actor}* - *Notes:* ${log.notes}`).join('\n')
      ].join('\n\n');
    }
    case 'list': {
      const list = listMatters();
      if (format === 'json') {
        return JSON.stringify(list, null, 2);
      }
      if (list.length === 0) {
        return `No matters found in persistence.\n`;
      }
      const rows = list
        .map(m => [m.id, m.name, m.schemaType, m.status, m.auditLog.length].join(' | '))
        .map(row => `| ${row} |`)
        .join('\n');
      return [
        `# Persisted Matters`,
        `| ID | Name | Schema Type | Status | Audit Logs |`,
        `| --- | --- | --- | --- | --- |`,
        rows
      ].join('\n\n');
    }
    case 'transition': {
      const id = subArgs['id'];
      const status = subArgs['status'] as any;
      const actor = subArgs['actor'];
      const notes = subArgs['notes'];
      if (!id || !status || !actor || !notes) {
        throw new Error('Usage: legal-ops-demo transition --id <id> --status <status> --actor <actor> --notes <notes>');
      }
      const updated = transitionMatterStatus(id, status, actor, notes);
      if (format === 'json') {
        return JSON.stringify(updated, null, 2);
      }
      return `✅ Status for matter **${id}** updated to **${status}**.\n`;
    }
  }

  throw new Error(`Unknown subcommand: ${subcommand}`);
}

class DemoCliHelpRequested extends Error {
  constructor() {
    super('Help requested');
  }
}

function buildMatterReport(workflow: DemoWorkflow, options: DemoCliOptions): DemoMatterReport {
  const schemaPath = path.join(options.schemasDir, `${workflow.prefix}.schema.json`);
  const examplePath = path.join(options.examplesDir, `${workflow.prefix}.example.json`);
  const schema = readJSON(schemaPath);
  const data = readJSON(examplePath) as Record<string, unknown>;
  const validation = validateJSON(schema, data);
  const risk = calculateRisk(workflow.schemaType, data);
  const actionPlan = createLegalActionPlan(workflow.schemaType, data, { risk });
  const evidencePack = createEvidencePack(workflow.schemaType, data, {
    actionPlan,
    generatedAt: options.generatedAt,
    risk
  });
  const contractPlaybook = workflow.schemaType === 'SaaSContractIntake'
    ? createContractPlaybookReview(data, {
      actionPlan,
      generatedAt: options.generatedAt,
      risk
    })
    : undefined;

  return {
    id: workflow.id,
    name: workflow.name,
    schemaType: workflow.schemaType,
    schemaPath,
    examplePath,
    validation,
    risk,
    actionPlan,
    evidencePack,
    contractPlaybook
  };
}

function readJSON(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseFormat(value: string | undefined): DemoOutputFormat {
  const format = requireValue('--format', value);
  if (format === 'json' || format === 'markdown') {
    return format;
  }

  throw new Error(`Unsupported format: ${format}`);
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function plural(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${runLegalOpsDemo(process.argv)}\n`);
  } catch (error) {
    if (error instanceof DemoCliHelpRequested) {
      process.stdout.write(`${renderDemoHelp()}\n`);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`legal-ops-demo failed: ${message}\n`);
    process.exitCode = 1;
  }
}

const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);

if (executedPath === modulePath) {
  void main();
}
