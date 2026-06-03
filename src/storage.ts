import * as fs from 'fs';
import * as path from 'path';

export interface PersistedMatter {
  id: string;
  name: string;
  schemaType: string;
  data: any;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  auditLog: {
    timestamp: string;
    action: string;
    actor: string;
    notes: string;
  }[];
  dueDate?: string;
}

export const MATTER_STATUS_VALUES = ['draft', 'pending_review', 'approved', 'rejected'] as const;
const FINAL_STATUSES: PersistedMatter['status'][] = ['approved', 'rejected'];

export function isMatterStatus(status: unknown): status is PersistedMatter['status'] {
  return typeof status === 'string' && (MATTER_STATUS_VALUES as readonly string[]).includes(status);
}

const getStorageDir = () => {
  const cwd = process.cwd();
  const isDashboard = cwd.endsWith('/dashboard') || cwd.endsWith('\\dashboard') || cwd.includes('/dashboard/') || cwd.includes('\\dashboard\\');
  const baseDir = isDashboard ? path.resolve(cwd, '..') : cwd;
  return path.resolve(baseDir, '.storage', 'matters');
};

const STORAGE_DIR = getStorageDir();

function ensureDirExists() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function saveMatter(matter: PersistedMatter): void {
  ensureDirExists();
  const filePath = path.join(STORAGE_DIR, `${matter.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(matter, null, 2), 'utf8');
}

export function loadMatter(id: string): PersistedMatter | null {
  ensureDirExists();
  const filePath = path.join(STORAGE_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PersistedMatter;
  } catch {
    return null;
  }
}

export function listMatters(): PersistedMatter[] {
  ensureDirExists();
  try {
    const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'));
    return files
      .map(file => {
        try {
          const filePath = path.join(STORAGE_DIR, file);
          return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PersistedMatter;
        } catch {
          return null;
        }
      })
      .filter((m): m is PersistedMatter => m !== null);
  } catch {
    return [];
  }
}

export function deleteMatter(id: string): boolean {
  ensureDirExists();
  const filePath = path.join(STORAGE_DIR, `${id}.json`);
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
