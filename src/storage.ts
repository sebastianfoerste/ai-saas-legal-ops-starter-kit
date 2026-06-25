import * as fs from 'fs';
import * as path from 'path';
import { isSchemaType } from './schema-types.js';
import { requireRepoRoot } from './workflows.js';

export interface PersistedMatter {
  id: string;
  name: string;
  schemaType: string;
  data: Record<string, unknown>;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  auditLog: {
    timestamp: string;
    action: string;
    actor: string;
    notes: string;
  }[];
  dueDate?: string;
  validationErrors?: string[];
}

export const MATTER_STATUS_VALUES = ['draft', 'pending_review', 'approved', 'rejected'] as const;
export const MATTER_CREATION_STATUS_VALUES = ['draft', 'pending_review'] as const;
const FINAL_STATUSES: PersistedMatter['status'][] = ['approved', 'rejected'];
const SAFE_MATTER_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function isMatterStatus(status: unknown): status is PersistedMatter['status'] {
  return typeof status === 'string' && (MATTER_STATUS_VALUES as readonly string[]).includes(status);
}

export function isMatterCreationStatus(status: unknown): status is 'draft' | 'pending_review' {
  return typeof status === 'string' && (MATTER_CREATION_STATUS_VALUES as readonly string[]).includes(status);
}

export function isSafeMatterId(id: unknown): id is string {
  return typeof id === 'string' && SAFE_MATTER_ID_PATTERN.test(id);
}

export function validateMatterId(id: unknown): string {
  if (!isSafeMatterId(id)) {
    throw new Error('Matter id must be 1-80 characters and contain only letters, numbers, underscores, or hyphens');
  }
  return id;
}

export function assertMatterCreationAllowed(status: PersistedMatter['status']): void {
  if (!isMatterCreationStatus(status)) {
    throw new Error('Matters may only be created as draft or pending_review. Final states require a reviewer transition.');
  }
}

export interface MatterStorageDiagnostic {
  filePath?: string;
  id?: string;
  reason: string;
}

export interface MatterListResult {
  matters: PersistedMatter[];
  diagnostics: MatterStorageDiagnostic[];
}

const getStorageDir = () => {
  return path.resolve(requireRepoRoot(), '.storage', 'matters');
};

function ensureDirExists(): string {
  const storageDir = getStorageDir();
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  return storageDir;
}

function matterFilePath(id: unknown, storageDir = getStorageDir()): string {
  const safeId = validateMatterId(id);
  const filePath = path.resolve(storageDir, `${safeId}.json`);
  const storageRoot = path.resolve(storageDir);
  if (filePath !== path.join(storageRoot, `${safeId}.json`)) {
    throw new Error(`Unsafe matter path resolved for id: ${safeId}`);
  }
  return filePath;
}

export function saveMatter(matter: PersistedMatter): void {
  const storageDir = ensureDirExists();
  const validation = validatePersistedMatter(matter);
  if (!validation.valid) {
    throw new Error(`Invalid persisted matter: ${validation.errors.join('; ')}`);
  }

  const filePath = matterFilePath(matter.id, storageDir);
  const tempPath = path.join(
    storageDir,
    `${matter.id}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );

  try {
    fs.writeFileSync(tempPath, JSON.stringify(matter, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

export function loadMatter(id: string): PersistedMatter | null {
  const result = loadMatterWithDiagnostics(id);
  return result.matter;
}

export function loadMatterWithDiagnostics(id: string): { matter: PersistedMatter | null; diagnostic?: MatterStorageDiagnostic } {
  const storageDir = ensureDirExists();
  let filePath: string;
  try {
    filePath = matterFilePath(id, storageDir);
  } catch (error) {
    return {
      matter: null,
      diagnostic: {
        id,
        reason: error instanceof Error ? error.message : String(error)
      }
    };
  }

  if (!fs.existsSync(filePath)) {
    return { matter: null };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    const validation = validatePersistedMatter(parsed);
    if (!validation.valid) {
      return {
        matter: null,
        diagnostic: {
          filePath,
          id,
          reason: validation.errors.join('; ')
        }
      };
    }
    return { matter: parsed as PersistedMatter };
  } catch (error) {
    return {
      matter: null,
      diagnostic: {
        filePath,
        id,
        reason: `Unable to read matter file: ${error instanceof Error ? error.message : String(error)}`
      }
    };
  }
}

export function listMatters(): PersistedMatter[] {
  return listMattersWithDiagnostics().matters;
}

export function listMattersWithDiagnostics(): MatterListResult {
  const storageDir = ensureDirExists();
  const diagnostics: MatterStorageDiagnostic[] = [];
  try {
    const files = fs.readdirSync(storageDir).filter(f => f.endsWith('.json'));
    const matters = files
      .flatMap(file => {
        const filePath = path.join(storageDir, file);
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
          const validation = validatePersistedMatter(parsed);
          if (!validation.valid) {
            diagnostics.push({
              filePath,
              reason: validation.errors.join('; ')
            });
            return [];
          }
          return [parsed as PersistedMatter];
        } catch (error) {
          diagnostics.push({
            filePath,
            reason: `Unable to read matter file: ${error instanceof Error ? error.message : String(error)}`
          });
          return [];
        }
      });
    return { matters, diagnostics };
  } catch (error) {
    return {
      matters: [],
      diagnostics: [
        {
          reason: `Unable to list matter storage: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

export function deleteMatter(id: string): boolean {
  const storageDir = ensureDirExists();
  const filePath = matterFilePath(id, storageDir);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

export function transitionMatterStatus(
  id: string,
  newStatus: PersistedMatter['status'],
  actor: string,
  notes: string,
  actorRole?: string
): PersistedMatter {
  validateMatterId(id);
  const matter = loadMatter(id);
  if (!matter) {
    throw new Error(`Matter with ID ${id} not found`);
  }

  if (!isMatterStatus(newStatus)) {
    throw new Error(`Unsupported matter status: ${newStatus}`);
  }

  if (!notes.trim()) {
    throw new Error('Review notes are required for every status transition');
  }

  if (FINAL_STATUSES.includes(matter.status)) {
    throw new Error(`Matter ${id} is already finalized as ${matter.status}`);
  }

  if (FINAL_STATUSES.includes(newStatus) && actorRole !== 'General Counsel') {
    throw new Error('Only the General Counsel role may approve or reject a matter');
  }

  if (matter.status === newStatus) {
    return matter;
  }

  matter.status = newStatus;
  matter.auditLog.push({
    timestamp: new Date().toISOString(),
    action: `Transition status to ${newStatus}`,
    actor,
    notes
  });

  saveMatter(matter);
  return matter;
}

function validatePersistedMatter(value: unknown): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!isPlainObject(value)) {
    return { valid: false, errors: ['Matter file must contain an object'] };
  }

  try {
    validateMatterId(value.id);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (!isNonEmptyString(value.name)) {
    errors.push('Matter name must be a non-empty string');
  }

  if (!isSchemaType(value.schemaType)) {
    errors.push(`Unsupported schema type: ${String(value.schemaType)}`);
  }

  if (!isPlainObject(value.data)) {
    errors.push('Matter data must be an object');
  }

  if (!isMatterStatus(value.status)) {
    errors.push(`Unsupported matter status: ${String(value.status)}`);
  }

  if (!Array.isArray(value.auditLog)) {
    errors.push('Matter auditLog must be an array');
  } else {
    value.auditLog.forEach((entry, index) => {
      if (!isPlainObject(entry)) {
        errors.push(`Matter auditLog[${index}] must be an object`);
        return;
      }
      if (!isNonEmptyString(entry.timestamp)) {
        errors.push(`Matter auditLog[${index}].timestamp must be a non-empty string`);
      }
      if (!isNonEmptyString(entry.action)) {
        errors.push(`Matter auditLog[${index}].action must be a non-empty string`);
      }
      if (!isNonEmptyString(entry.actor)) {
        errors.push(`Matter auditLog[${index}].actor must be a non-empty string`);
      }
      if (typeof entry.notes !== 'string' || entry.notes.trim().length === 0) {
        errors.push(`Matter auditLog[${index}].notes must be a non-empty string`);
      }
    });
  }

  if (value.dueDate !== undefined && typeof value.dueDate !== 'string') {
    errors.push('Matter dueDate must be a string when provided');
  }

  if (value.validationErrors !== undefined) {
    if (!Array.isArray(value.validationErrors) || !value.validationErrors.every(item => typeof item === 'string')) {
      errors.push('Matter validationErrors must be an array of strings when provided');
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
