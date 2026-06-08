import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  canonicalSchemaType,
  SCHEMA_FILE_BY_TYPE
} from './schema-types.js';
export {
  canonicalSchemaType,
  isSchemaType,
  normalizeSchemaType,
  SCHEMA_FILE_BY_TYPE,
  SCHEMA_TYPES,
  schemaPrefixForType,
  WORKFLOWS,
  type SchemaType,
  type WorkflowDefinition
} from './schema-types.js';

export const PACKAGE_NAME = '@sebastianfoerste/ai-saas-legal-ops-starter-kit';

export interface RepoRootResolution {
  rootDir: string | null;
  searchedFrom: string[];
  reason?: string;
}

export function resolveRepoRoot(startDir = process.cwd()): RepoRootResolution {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = uniquePaths([
    startDir,
    process.cwd(),
    moduleDir,
    path.resolve(moduleDir, '..'),
    path.resolve(moduleDir, '..', '..')
  ]);
  const searchedFrom: string[] = [];

  for (const candidate of candidates) {
    let current = path.resolve(candidate);
    while (!searchedFrom.includes(current)) {
      searchedFrom.push(current);
      const packageJsonPath = path.join(current, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { name?: unknown };
          if (packageJson.name === PACKAGE_NAME || hasRepoMarkers(current)) {
            return { rootDir: current, searchedFrom };
          }
        } catch {
          if (hasRepoMarkers(current)) {
            return { rootDir: current, searchedFrom };
          }
        }
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return {
    rootDir: null,
    searchedFrom,
    reason: `Unable to resolve ${PACKAGE_NAME} package root`
  };
}

export function requireRepoRoot(startDir = process.cwd()): string {
  const resolution = resolveRepoRoot(startDir);
  if (!resolution.rootDir) {
    throw new Error(resolution.reason ?? `Unable to resolve ${PACKAGE_NAME} package root`);
  }
  return resolution.rootDir;
}

export function resolveWorkflowPath(...segments: string[]): string {
  return path.resolve(requireRepoRoot(), ...segments);
}

export function schemaPathForType(schemaType: string, startDir = process.cwd()): string {
  const canonical = canonicalSchemaType(schemaType);
  return path.resolve(requireRepoRoot(startDir), 'schemas', SCHEMA_FILE_BY_TYPE[canonical]);
}

export function loadSchemaForType(schemaType: string, startDir = process.cwd()): unknown {
  const schemaPath = schemaPathForType(schemaType, startDir);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file for ${schemaType} was not found at ${schemaPath}`);
  }
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function hasRepoMarkers(candidate: string): boolean {
  return fs.existsSync(path.join(candidate, 'schemas'))
    && fs.existsSync(path.join(candidate, 'examples'))
    && fs.existsSync(path.join(candidate, 'policies'));
}

function uniquePaths(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const resolved = path.resolve(value);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      result.push(resolved);
    }
  }
  return result;
}
