import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const rootDir = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const requiredExports = [
  'createLegalActionPlan',
  'createRegulatoryObligationMatrix',
  'renderRegulatoryObligationMatrixMarkdown',
  'createDecisionPacket',
  'renderDecisionPacketMarkdown',
  'createIntegrityManifest',
  'getPolicyHealth'
];
const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'dist/src/index.js',
  'dist/src/index.d.ts',
  'dist/src/cli.js',
  'schemas/saas-contract-intake.schema.json',
  'examples/saas-contract-intake.example.json',
  'policies/rules.json',
  'templates/saas-contract-intake.md'
];
const forbiddenPrefixes = [
  'dashboard/',
  'tests/',
  'src/',
  'dist/tests/',
  '.github/',
  '.storage/',
  'node_modules/'
];
const forbiddenFiles = [
  'APP_IMPROVEMENT_PLAN.md',
  'FULL_HARDENING_PLAN.md',
  'package-lock.json',
  'dashboard/package-lock.json'
];

assert(packageJson.main === 'dist/src/index.js', 'package main must point at dist/src/index.js');
assert(packageJson.types === 'dist/src/index.d.ts', 'package types must point at dist/src/index.d.ts');
assert(packageJson.exports?.['.']?.import === './dist/src/index.js', 'root export import path must point at dist/src/index.js');
assert(packageJson.exports?.['.']?.types === './dist/src/index.d.ts', 'root export types path must point at dist/src/index.d.ts');
assert(packageJson.bin?.['legal-ops-demo'] === 'dist/src/cli.js', 'CLI bin path must point at dist/src/cli.js');
assert(existsSync(path.join(rootDir, packageJson.main)), `Missing built entrypoint: ${packageJson.main}`);
assert(existsSync(path.join(rootDir, packageJson.types)), `Missing built declaration file: ${packageJson.types}`);
assert(existsSync(path.join(rootDir, packageJson.bin['legal-ops-demo'])), 'Missing built CLI file');

const entry = await import(pathToFileURL(path.join(rootDir, packageJson.main)).href);
for (const exportName of requiredExports) {
  assert(exportName in entry, `Missing package export: ${exportName}`);
}

const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: rootDir,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
});
const packResult = JSON.parse(packOutput)[0];
const files = packResult.files.map(file => file.path).sort();

for (const file of requiredFiles) {
  assert(files.includes(file), `Pack output is missing ${file}`);
}

for (const file of files) {
  assert(!forbiddenPrefixes.some(prefix => file.startsWith(prefix)), `Pack output includes forbidden path: ${file}`);
  assert(!forbiddenFiles.includes(file), `Pack output includes forbidden file: ${file}`);
}

assert(files.length <= 120, `Pack output is unexpectedly broad: ${files.length} files`);

console.log(`Package smoke passed with ${files.length} packed files.`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
