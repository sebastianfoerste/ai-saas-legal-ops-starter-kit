import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

describe('Package publishability metadata', () => {
  test('points package entrypoints at the actual build output', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

    expect(packageJson.main).toBe('dist/src/index.js');
    expect(packageJson.types).toBe('dist/src/index.d.ts');
    expect(packageJson.exports['.'].import).toBe('./dist/src/index.js');
    expect(packageJson.exports['.'].types).toBe('./dist/src/index.d.ts');
    expect(packageJson.exports['./cli'].import).toBe('./dist/src/cli.js');
    expect(packageJson.bin['legal-ops-demo']).toBe('dist/src/cli.js');
  });

  test('uses a narrow files whitelist for npm packaging', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const files = packageJson.files as string[];

    expect(files).toEqual(expect.arrayContaining([
      'dist/src',
      'schemas',
      'examples',
      'policies',
      'templates',
      'docs',
      'README.md',
      'LICENSE'
    ]));
    expect(files).not.toContain('tests');
    expect(files).not.toContain('dashboard');
    expect(files).not.toContain('.storage');
  });
});
