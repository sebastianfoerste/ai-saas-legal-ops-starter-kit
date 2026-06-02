import {
  createLegalActionPlan,
  type LegalActionPlan,
  type LegalMatterData,
  type ReviewGate
} from './action-plan.js';
import type { RiskLevel } from './risk-scoring.js';

export type RegisterMatterStatus = 'self-serve' | 'needs-review' | 'blocked';

export interface LegalRiskRegisterInput {
  id: string;
  name: string;
  schemaType: string;
  data: LegalMatterData;
  owner?: string;
  dueDate?: string;
  plan?: LegalActionPlan;
}

export interface LegalRiskRegisterOptions {
  generatedAt?: string;
  today?: string;
  dueSoonDays?: number;
  topBlockerLimit?: number;
}

export interface LegalRiskRegisterMatter {
  id: string;
  name: string;
  schemaType: string;
  owner?: string;
  dueDate?: string;
  daysUntilDue?: number;
  overdue: boolean;
  dueSoon: boolean;
  status: RegisterMatterStatus;
  plan: LegalActionPlan;
}

export interface ApprovalQueueItem {
  approval: string;
  count: number;
  matterIds: string[];
  highestRisk: RiskLevel;
}

export interface LegalRiskRegisterSummary {
  generatedAt: string;
  totalMatters: number;
  countsByRisk: Record<RiskLevel, number>;
  countsByReviewGate: Record<ReviewGate, number>;
  matters: LegalRiskRegisterMatter[];
  materialMatters: LegalRiskRegisterMatter[];
  overdueMatters: LegalRiskRegisterMatter[];
  approvalQueue: ApprovalQueueItem[];
  topBlockers: string[];
  executiveSummary: string;
  recommendedActions: string[];
  humanReviewRequired: boolean;
}

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'escalate'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createLegalRiskRegister(
  inputs: LegalRiskRegisterInput[],
  options: LegalRiskRegisterOptions = {}
): LegalRiskRegisterSummary {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const today = parseDate(options.today ?? generatedAt.slice(0, 10)) ?? stripToUtcDate(new Date());
  const dueSoonDays = options.dueSoonDays ?? 14;
  const topBlockerLimit = options.topBlockerLimit ?? 8;

  const matters = inputs.map(input => toRegisterMatter(input, today, dueSoonDays));
  const countsByRisk = createRiskCounts();
  const countsByReviewGate = createReviewGateCounts();

  for (const matter of matters) {
    countsByRisk[matter.plan.risk.level] += 1;
    countsByReviewGate[matter.plan.reviewGate] += 1;
  }

  const materialMatters = matters.filter(matter => isMaterial(matter));
  const overdueMatters = matters.filter(matter => matter.overdue);
  const approvalQueue = buildApprovalQueue(matters);
  const topBlockers = uniqueStrings(
    materialMatters.flatMap(matter => matter.plan.blockers)
  ).slice(0, topBlockerLimit);
  const humanReviewRequired = matters.some(matter => matter.plan.reviewGate !== 'self-serve');

  return {
    generatedAt,
    totalMatters: matters.length,
    countsByRisk,
    countsByReviewGate,
    matters,
    materialMatters,
    overdueMatters,
    approvalQueue,
    topBlockers,
    executiveSummary: buildExecutiveSummary(matters, countsByRisk, countsByReviewGate, overdueMatters.length),
    recommendedActions: buildRecommendedActions(countsByRisk, countsByReviewGate, overdueMatters.length, approvalQueue),
    humanReviewRequired
  };
}

function toRegisterMatter(
  input: LegalRiskRegisterInput,
  today: Date,
  dueSoonDays: number
): LegalRiskRegisterMatter {
  const plan = input.plan ?? createLegalActionPlan(input.schemaType, input.data);
  const dueDate = input.dueDate ?? inferDueDate(input.data);
  const due = parseDate(dueDate);
  const daysUntilDue = due ? Math.ceil((due.getTime() - today.getTime()) / MS_PER_DAY) : undefined;
  const overdue = typeof daysUntilDue === 'number' ? daysUntilDue < 0 : false;
  const dueSoon = typeof daysUntilDue === 'number' ? daysUntilDue >= 0 && daysUntilDue <= dueSoonDays : false;

  return {
    id: input.id,
    name: input.name,
    schemaType: input.schemaType,
    owner: input.owner,
    dueDate,
    daysUntilDue,
    overdue,
    dueSoon,
    status: inferStatus(plan),
    plan
  };
}

function inferStatus(plan: LegalActionPlan): RegisterMatterStatus {
  if (plan.priority === 'blocked') {
    return 'blocked';
  }
  if (plan.reviewGate === 'self-serve') {
    return 'self-serve';
  }
  return 'needs-review';
}

function inferDueDate(data: LegalMatterData): string | undefined {
  for (const key of ['targetDate', 'requestedDeadline', 'reviewDate']) {
    const value = data[key];
    if (typeof value === 'string' && parseDate(value)) {
      return value;
    }
  }
  return undefined;
}

function createRiskCounts(): Record<RiskLevel, number> {
  return {
    low: 0,
    medium: 0,
    high: 0,
    escalate: 0
  };
}

function createReviewGateCounts(): Record<ReviewGate, number> {
  return {
    'self-serve': 0,
    'legal-review': 0,
    'senior-legal-review': 0,
    'gc-review': 0
  };
}

function isMaterial(matter: LegalRiskRegisterMatter): boolean {
  return matter.plan.risk.level === 'high' || matter.plan.risk.level === 'escalate' || matter.overdue;
}

function buildApprovalQueue(matters: LegalRiskRegisterMatter[]): ApprovalQueueItem[] {
  const queue = new Map<string, { matterIds: string[]; highestRisk: RiskLevel }>();

  for (const matter of matters) {
    if (matter.plan.reviewGate === 'self-serve') {
      continue;
    }

    for (const approval of matter.plan.requiredApprovals) {
      const existing = queue.get(approval);
      if (!existing) {
        queue.set(approval, {
          matterIds: [matter.id],
          highestRisk: matter.plan.risk.level
        });
        continue;
      }

      existing.matterIds.push(matter.id);
      existing.highestRisk = maxRisk(existing.highestRisk, matter.plan.risk.level);
    }
  }

  return [...queue.entries()]
    .map(([approval, item]) => ({
      approval,
      count: item.matterIds.length,
      matterIds: item.matterIds,
      highestRisk: item.highestRisk
    }))
    .sort((a, b) => {
      const riskDelta = RISK_LEVELS.indexOf(b.highestRisk) - RISK_LEVELS.indexOf(a.highestRisk);
      if (riskDelta !== 0) {
        return riskDelta;
      }
      return b.count - a.count || a.approval.localeCompare(b.approval);
    });
}

function buildExecutiveSummary(
  matters: LegalRiskRegisterMatter[],
  countsByRisk: Record<RiskLevel, number>,
  countsByReviewGate: Record<ReviewGate, number>,
  overdueCount: number
): string {
  if (matters.length === 0) {
    return 'No legal matters are currently recorded in the register.';
  }

  const highOrEscalated = countsByRisk.high + countsByRisk.escalate;
  const reviewCount = matters.length - countsByReviewGate['self-serve'];
  const overdueSentence = overdueCount > 0
    ? ` ${overdueCount} ${plural('matter', overdueCount)} ${overdueCount === 1 ? 'is' : 'are'} overdue.`
    : '';

  return `${matters.length} ${plural('matter', matters.length)} reviewed. ${highOrEscalated} ${plural('matter', highOrEscalated)} ${highOrEscalated === 1 ? 'is' : 'are'} high-risk or escalated, and ${reviewCount} ${plural('matter', reviewCount)} require human review.${overdueSentence}`;
}

function buildRecommendedActions(
  countsByRisk: Record<RiskLevel, number>,
  countsByReviewGate: Record<ReviewGate, number>,
  overdueCount: number,
  approvalQueue: ApprovalQueueItem[]
): string[] {
  const actions: string[] = [];

  if (countsByRisk.escalate > 0) {
    actions.push(`Route ${countsByRisk.escalate} escalated ${plural('matter', countsByRisk.escalate)} to GC review before approval, launch, or customer commitment.`);
  }
  if (countsByRisk.high > 0) {
    actions.push(`Assign senior legal review for ${countsByRisk.high} high-risk ${plural('matter', countsByRisk.high)}.`);
  }
  if (overdueCount > 0) {
    actions.push(`Clear ${overdueCount} overdue ${plural('matter', overdueCount)} or reset the accountable review date.`);
  }
  if (approvalQueue.length > 0) {
    actions.push(`Clear the largest approval queue first: ${approvalQueue[0].approval} (${approvalQueue[0].count} ${plural('matter', approvalQueue[0].count)}).`);
  }
  if (countsByReviewGate['self-serve'] > 0) {
    actions.push(`Keep ${countsByReviewGate['self-serve']} low-friction ${plural('matter', countsByReviewGate['self-serve'])} in the self-serve playbook with audit logging.`);
  }
  if (actions.length === 0) {
    actions.push('Maintain the current register and continue routine intake validation.');
  }

  return actions;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }

  return date;
}

function stripToUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function maxRisk(left: RiskLevel, right: RiskLevel): RiskLevel {
  return RISK_LEVELS.indexOf(right) > RISK_LEVELS.indexOf(left) ? right : left;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }

  return result;
}

function plural(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
