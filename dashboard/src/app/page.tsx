'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionPlanTab,
  AuditTab,
  DecisionPacketTab,
  EvidenceTab,
  GuidedIntakeFields,
  HealthStrip,
  Metric,
  OverviewTab,
  PlaybookTab,
  RegulatoryMatrixTab,
  RiskBadge,
  StatusBadge
} from './dashboard-components';

type MatterStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
type RiskLevel = 'low' | 'medium' | 'high' | 'escalate';
type ReviewGate = 'self-serve' | 'legal-review' | 'senior-legal-review' | 'gc-review';
type EvidenceReadiness = 'ready' | 'review_needed' | 'blocked';
type RegulatoryReadiness = 'satisfied' | 'needs_review' | 'missing' | 'not_applicable';
type UserRole = 'Sales Sponsor' | 'DPO Reviewer' | 'General Counsel';
type SchemaType =
  | 'SaaSContractIntake'
  | 'DPATriage'
  | 'AIVendorReview'
  | 'OpenSourceReview'
  | 'CustomerCommitment'
  | 'ProductLaunchIntake';

type MatterData = Record<string, unknown>;

interface AuditEvent {
  timestamp: string;
  action: string;
  actor: string;
  notes: string;
}

interface PersistedMatter {
  id: string;
  name: string;
  schemaType: SchemaType;
  data: MatterData;
  status: MatterStatus;
  auditLog: AuditEvent[];
  dueDate?: string;
  validationErrors?: string[];
  riskLevel?: RiskLevel;
  reviewGate?: ReviewGate;
  evidenceReadiness?: EvidenceReadiness;
  regulatoryMatrixGaps?: number;
}

interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

interface LegalActionPlan {
  summary: string;
  nextAction: string;
  reviewGate: ReviewGate;
  priority: 'routine' | 'watch' | 'urgent' | 'blocked';
  requiredApprovals: string[];
  blockers: string[];
  followUps: string[];
  evidenceToCollect: string[];
}

interface EvidenceItem {
  id: string;
  title: string;
  framework: string;
  status: 'satisfied' | 'missing' | 'needs_review' | 'not_applicable';
  priority: 'routine' | 'important' | 'critical';
  evidenceRequired: string[];
  rationale: string;
}

interface RegulatoryMatrixRow {
  id: string;
  framework: string;
  obligation: string;
  trigger: string;
  sourceFields: string[];
  evidenceRequired: string[];
  owner: string;
  reviewGate: string;
  readiness: RegulatoryReadiness;
  rationale: string;
}

interface RegulatoryMatrix {
  rows: RegulatoryMatrixRow[];
  gaps: RegulatoryMatrixRow[];
  humanReviewRequired: boolean;
  humanReviewNotice: string;
}

interface EvidencePack {
  readiness: EvidenceReadiness;
  items: EvidenceItem[];
  missingEvidence: EvidenceItem[];
  requiredApprovals: string[];
  humanReviewRequired: boolean;
}

interface ContractPlaybookDeviation {
  id: string;
  category: string;
  severity: 'standard' | 'negotiable' | 'requires_approval' | 'nonstarter';
  sourceText: string;
  issue: string;
  standardPosition: string;
  fallbackPosition: string;
  approvalRequired: string[];
  rationale: string;
}

interface ContractPlaybook {
  negotiationSummary: string;
  deviations: ContractPlaybookDeviation[];
  nonStarters: ContractPlaybookDeviation[];
  approvalRequired: string[];
  reviewerNotes: string[];
  humanReviewRequired: boolean;
}

interface PolicyHealth {
  status: string;
  path?: string;
  loadedRules: number;
  errors: string[];
}

interface DecisionPacket {
  matterName: string;
  schemaType: string;
  generatedAt: string;
  reviewerNote?: string;
  integrityManifest: {
    algorithm: 'sha256';
    overallDigest: string;
    sections: Array<{ section: string; digest: string }>;
  };
  humanReviewNotice: string;
}

interface StorageDiagnostic {
  filePath?: string;
  id?: string;
  reason: string;
}

interface AnalysisResult {
  matter?: PersistedMatter;
  validation?: {
    valid: boolean;
    errors?: string[];
  };
  risk?: RiskAssessment;
  actionPlan?: LegalActionPlan;
  evidencePack?: EvidencePack;
  regulatoryMatrix?: RegulatoryMatrix;
  contractPlaybook?: ContractPlaybook;
  policyHealth?: PolicyHealth;
  decisionPacket?: DecisionPacket;
}

interface WorkflowConfig {
  type: SchemaType;
  label: string;
  shortLabel: string;
  owner: string;
  defaultName: string;
  defaultData: MatterData;
}

const WORKFLOWS: WorkflowConfig[] = [
  {
    type: 'SaaSContractIntake',
    label: 'Enterprise SaaS MSA',
    shortLabel: 'Contract',
    owner: 'Sales and Legal',
    defaultName: 'Regulated workspace MSA',
    defaultData: {
      requestOwner: 'Enterprise Sales Lead',
      customer: 'Atlas Metrics Bank',
      contractType: 'MSA',
      dealStage: 'Negotiation',
      requestedDeadline: futureDate(12),
      customerSector: 'Finance',
      regulatedCustomer: true,
      deploymentModel: 'Single-Tenant Dedicated',
      dataCategories: [
        'employee names',
        'workspace documents',
        'prompt inputs',
        'security logs',
        'banking workflow metadata'
      ],
      aiFeaturesInvolved: [
        'Knowledge agent over customer documents',
        'Workflow automation agent'
      ],
      modelOrVendorProvidersInvolved: [
        'OpenAI Enterprise API',
        'Anthropic Enterprise API'
      ],
      nonStandardTerms: [
        'Customer asks for 10x liability cap for security breach claims',
        'Customer requests prior notice for model provider changes'
      ],
      redFlags: [
        'Customer demands zero data retention verification audited by third party every quarter'
      ],
      businessPosition: 'Strategic regulated customer with expansion potential across several teams.',
      legalQuestion: 'Can we accept the security cap and model-provider notice language without creating inconsistent customer commitments?',
      exitStrategy: 'pending'
    }
  },
  {
    type: 'DPATriage',
    label: 'DPA and transfer review',
    shortLabel: 'Privacy',
    owner: 'Privacy and Security',
    defaultName: 'Enterprise agent DPA markup',
    defaultData: {
      productOrService: 'AI agent workspace',
      role: 'processor',
      dataSubjects: ['customer employees', 'contractors', 'workspace guests'],
      personalDataCategories: [
        'names',
        'email addresses',
        'workspace documents',
        'prompt inputs',
        'tool activity logs'
      ],
      specialCategoryData: [],
      subprocessors: [
        {
          name: 'Frontier Model Provider',
          location: 'non-EU United States',
          purpose: 'LLM inference'
        },
        {
          name: 'Vector Hosting Provider',
          location: 'EU',
          purpose: 'retrieval index hosting'
        }
      ],
      transferLocations: ['EU', 'US'],
      retentionPeriod: 'Term of agreement plus 30 days',
      deletionProcess: 'Certified deletion within 30 days after customer request',
      securityAnnexStatus: 'Custom Customer Requirements',
      customerRequestedChanges: [
        'Customer asks for custom audit rights over model providers',
        'Customer asks for prior notice of every subprocessor change'
      ],
      riskLevel: 'high',
      missingFacts: [
        'Confirm whether zero data retention is active for the model provider tenant'
      ]
    }
  },
  {
    type: 'AIVendorReview',
    label: 'AI vendor approval',
    shortLabel: 'AI Vendor',
    owner: 'Product, Security and Privacy',
    defaultName: 'Model provider ZDR review',
    defaultData: {
      vendor: 'Frontier Model Provider',
      tool: 'Enterprise LLM API with zero data retention addendum',
      useCase: 'Customer workspace agents, retrieval answers, summarisation and workflow automation',
      businessOwner: 'Head of Product Operations',
      dataEntered: [
        'customer workspace documents',
        'prompt inputs',
        'connector metadata',
        'agent execution traces'
      ],
      outputUse: 'Returned inside the customer workspace and logged for customer-visible audit review',
      retentionPosition: '30-day abuse monitoring logs unless zero data retention addendum is approved',
      trainingOnCustomerData: false,
      subprocessors: [
        'unverified regional logging vendor in non-EU country'
      ],
      securityMaterial: [
        'SOC 2 Type II report',
        'ISO 27001 certificate',
        'zero data retention addendum pending signature'
      ],
      approvedUse: false,
      prohibitedUse: [
        'Do not use with special category data until DPO review is complete',
        'Do not use for customer-facing regulated decisions'
      ],
      conditions: [
        'ZDR addendum signed before production traffic',
        'Security review confirms model logging and deletion controls',
        'Legal records approved use cases in the AI vendor register'
      ],
      copyrightIndemnity: false
    }
  },
  {
    type: 'OpenSourceReview',
    label: 'Open-source review',
    shortLabel: 'OSS',
    owner: 'Engineering and Legal',
    defaultName: 'Agent SDK licence check',
    defaultData: {
      package: 'collab-agent-sdk',
      licence: 'MPL-2.0',
      useCase: 'Embeds collaborative agent runtime helpers into the customer-facing SDK',
      distributionModel: 'Client-Side SDK',
      modifiedOrUnmodified: 'modified',
      linkedOrSeparateService: 'linked',
      attributionNeeded: true,
      copyleftConcern: false,
      approvalStatus: 'Pending Review'
    }
  },
  {
    type: 'CustomerCommitment',
    label: 'Customer commitment',
    shortLabel: 'Commitment',
    owner: 'Legal Operations',
    defaultName: 'EU processing commitment',
    defaultData: {
      customer: 'Northstar Bank',
      commitment: 'Customer workspace data, prompts, embeddings and agent logs remain within the EU processing boundary with no US model-provider failover.',
      sourceDocument: 'DPA Data Residency Rider, Section 2.1',
      owner: 'Infrastructure Lead',
      productArea: 'LLM gateway and retrieval layer',
      operationalDependency: 'EU-only model gateway route and disabled fallback to US inference endpoints',
      renewalRelevance: true,
      reviewDate: futureDate(21),
      currentStatus: 'at_risk',
      requiredAction: 'Confirm failover behavior, support access scope and model-provider logging before renewal call.'
    }
  },
  {
    type: 'ProductLaunchIntake',
    label: 'Product launch gate',
    shortLabel: 'Launch',
    owner: 'Product Counsel',
    defaultName: 'Regulated teams agent builder',
    defaultData: {
      feature: 'Workspace Agent Builder for Regulated Teams',
      owner: 'Director of AI Product',
      targetDate: futureDate(28),
      customerSegment: 'Enterprise regulated teams in finance, healthcare and telecom',
      jurisdictions: ['EU', 'US', 'UK'],
      dataInvolved: [
        'workspace documents',
        'prompt inputs',
        'tool execution metadata',
        'customer support transcripts'
      ],
      aiFeatures: [
        'Configurable agents connected to company knowledge and workflow tools',
        'Human approval step before consequential external actions'
      ],
      publicClaims: [
        'Teams can reduce manual triage time by 70 percent after implementation'
      ],
      customerCommitmentsAffected: [
        'Northstar Bank EU processing commitment',
        'Atlas Metrics Bank model-provider notice covenant'
      ],
      privacyImpact: 'Requires DPIA screening, transfer assessment update and privacy notice review.',
      contractImpact: 'Requires MSA AI feature description, DPA subprocessors refresh and customer commitment register update.',
      regulatoryImpact: 'DORA, EU AI Act transparency and regulated-sector governance review required before broad release.',
      requiredApprovals: [
        'DPO Sign-off',
        'Security Review',
        'Product Owner Approval',
        'GC Approval'
      ]
    }
  }
];

const ROLE_OPTIONS: UserRole[] = ['Sales Sponsor', 'DPO Reviewer', 'General Counsel'];
const STATUS_FILTERS: Array<'all' | MatterStatus> = ['all', 'draft', 'pending_review', 'approved', 'rejected'];
const TABS: Array<'overview' | 'plan' | 'evidence' | 'matrix' | 'playbook' | 'packet' | 'history'> = [
  'overview',
  'plan',
  'evidence',
  'matrix',
  'playbook',
  'packet',
  'history'
];

function futureDate(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
}

function createMatterId(): string {
  return `matter-${Math.random().toString(36).slice(2, 8)}`;
}

function workflowFor(type: SchemaType): WorkflowConfig {
  return WORKFLOWS.find(workflow => workflow.type === type) ?? WORKFLOWS[0];
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function formatDate(value?: string): string {
  if (!value) return 'No timestamp';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getMatterHeadline(matter: PersistedMatter): string {
  const data = matter.data;
  if (typeof data.customer === 'string') return data.customer;
  if (typeof data.vendor === 'string') return data.vendor;
  if (typeof data.feature === 'string') return data.feature;
  if (typeof data.productOrService === 'string') return data.productOrService;
  if (typeof data.package === 'string') return data.package;
  return matter.name;
}

function stringifyData(data: MatterData): string {
  return JSON.stringify(data, null, 2);
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (copyTextWithTextarea(text)) {
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

function copyTextWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

export default function Dashboard() {
  const [matters, setMatters] = useState<PersistedMatter[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<PersistedMatter | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('overview');
  const [userRole, setUserRole] = useState<UserRole>('Sales Sponsor');
  const [statusFilter, setStatusFilter] = useState<'all' | MatterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardSchema, setWizardSchema] = useState<SchemaType>('SaaSContractIntake');
  const [wizardName, setWizardName] = useState('');
  const [wizardId, setWizardId] = useState('');
  const [wizardPayload, setWizardPayload] = useState('');
  const [wizardError, setWizardError] = useState('');
  const [wizardAnalysis, setWizardAnalysis] = useState<AnalysisResult | null>(null);
  const [policyHealth, setPolicyHealth] = useState<PolicyHealth | null>(null);
  const [storageDiagnostics, setStorageDiagnostics] = useState<StorageDiagnostic[]>([]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const fetchMatters = useCallback(async () => {
    try {
      const response = await fetch('/api/matters', { cache: 'no-store' });
      const data = await response.json();
      if (Array.isArray(data)) {
        setMatters(data);
        setStorageDiagnostics([]);
      } else if (Array.isArray(data.matters)) {
        setMatters(data.matters);
        setStorageDiagnostics(Array.isArray(data.diagnostics) ? data.diagnostics : []);
        setPolicyHealth(data.policyHealth ?? null);
      }
    } catch {
      showToast('error', 'Matter queue could not be loaded.');
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMatters();
  }, [fetchMatters]);

  const selectMatter = useCallback(async (matter: PersistedMatter) => {
    setSelectedMatter(matter);
    setAnalysis(null);
    setActiveTab('overview');
    try {
      const response = await fetch(`/api/matters/${matter.id}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        showToast('error', result.error || 'Matter analysis failed.');
        return;
      }
      setSelectedMatter(result.matter);
      setAnalysis(result);
      setPolicyHealth(result.policyHealth ?? policyHealth);
    } catch {
      showToast('error', 'Matter analysis API could not be reached.');
    }
  }, [policyHealth, showToast]);

  const handleSeedData = async () => {
    try {
      const response = await fetch('/api/matters/seed', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        showToast('error', result.error || 'Demo matters could not be seeded.');
        return;
      }

      await fetchMatters();
      showToast('success', `Loaded ${result.seeded.length} synthetic Dust-style matters.`);
      if (result.seeded[0]) {
        const detail = await fetch(`/api/matters/${result.seeded[0]}`, { cache: 'no-store' });
        const detailResult = await detail.json();
        if (detail.ok) {
          setSelectedMatter(detailResult.matter);
          setAnalysis(detailResult);
        }
      }
    } catch {
      showToast('error', 'Demo seed API could not be reached.');
    }
  };

  const handleDeleteMatter = async (id: string) => {
    if (!window.confirm('Delete this synthetic matter from local demo storage?')) return;
    try {
      const response = await fetch(`/api/matters/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        showToast('error', 'Matter could not be deleted.');
        return;
      }
      if (selectedMatter?.id === id) {
        setSelectedMatter(null);
        setAnalysis(null);
      }
      await fetchMatters();
      showToast('success', 'Matter deleted from local demo storage.');
    } catch {
      showToast('error', 'Delete request failed.');
    }
  };

  const handleTransitionStatus = async (status: MatterStatus) => {
    if (!selectedMatter) return;
    if (!reviewNotes.trim()) {
      showToast('error', 'Add a review note before changing status.');
      return;
    }

    setIsTransitioning(true);
    try {
      const response = await fetch(`/api/matters/${selectedMatter.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          actor: `${userRole} demo user`,
          actorRole: userRole,
          notes: reviewNotes
        })
      });
      const result = await response.json();
      if (!response.ok) {
        showToast('error', result.error || 'Status transition failed.');
        return;
      }
      setReviewNotes('');
      await fetchMatters();
      await selectMatter(result.matter);
      showToast('success', `Matter moved to ${formatStatus(status)}.`);
    } catch {
      showToast('error', 'Status transition request failed.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const openWizard = () => {
    const workflow = workflowFor('SaaSContractIntake');
    const payload = stringifyData(workflow.defaultData);
    setWizardSchema(workflow.type);
    setWizardName(workflow.defaultName);
    setWizardId(createMatterId());
    setWizardPayload(payload);
    setWizardError('');
    setWizardAnalysis(null);
    setIsWizardOpen(true);
    void runWizardAnalysis(workflow.type, payload);
  };

  const handleSchemaChange = (type: SchemaType) => {
    const workflow = workflowFor(type);
    const payload = stringifyData(workflow.defaultData);
    setWizardSchema(type);
    setWizardName(workflow.defaultName);
    setWizardPayload(payload);
    setWizardError('');
    void runWizardAnalysis(type, payload);
  };

  const handleWizardPayloadChange = (value: string) => {
    setWizardPayload(value);
    void runWizardAnalysis(wizardSchema, value);
  };

  const wizardData = useMemo(() => {
    try {
      const parsed = JSON.parse(wizardPayload);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MatterData : null;
    } catch {
      return null;
    }
  }, [wizardPayload]);

  const updateWizardField = (field: string, value: unknown) => {
    if (!wizardData) return;
    handleWizardPayloadChange(stringifyData({ ...wizardData, [field]: value }));
  };

  const runWizardAnalysis = async (schema: SchemaType, payload: string) => {
    try {
      const data = JSON.parse(payload) as MatterData;
      setWizardError('');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaType: schema, data })
      });
      if (response.ok) {
        setWizardAnalysis(await response.json());
      }
    } catch {
      setWizardError('Payload is not valid JSON.');
      setWizardAnalysis(null);
    }
  };

  const handleSaveWizard = async (status: MatterStatus) => {
    if (!wizardName.trim() || !wizardId.trim()) {
      showToast('error', 'Matter name and ID are required.');
      return;
    }

    let data: MatterData;
    try {
      data = JSON.parse(wizardPayload) as MatterData;
    } catch {
      showToast('error', 'Payload is not valid JSON.');
      return;
    }

    try {
      const response = await fetch('/api/matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: wizardId,
          name: wizardName,
          schemaType: wizardSchema,
          data,
          status,
          actor: `${userRole} demo user`,
          notes: status === 'pending_review'
            ? 'Submitted through self-serve intake for legal review.'
            : 'Created through self-serve intake as draft.'
        })
      });
      const result = await response.json();
      if (!response.ok) {
        showToast('error', result.error || 'Matter could not be saved.');
        return;
      }
      setIsWizardOpen(false);
      await fetchMatters();
      await selectMatter(result.matter);
      showToast('success', `Matter saved as ${formatStatus(status)}.`);
    } catch {
      showToast('error', 'Matter save request failed.');
    }
  };

  const copyEvidenceMemo = async () => {
    if (!selectedMatter || !analysis?.evidencePack) return;
    const rows = analysis.evidencePack.items
      .map(item => `- ${item.title}: ${item.status}, ${item.evidenceRequired.join('; ')}`)
      .join('\n');
    await copyTextToClipboard([
      `# Evidence Pack: ${selectedMatter.name}`,
      `Readiness: ${analysis.evidencePack.readiness}`,
      '',
      rows
    ].join('\n'));
    showToast('success', 'Evidence memo copied.');
  };

  const copyPlaybookMemo = async () => {
    if (!selectedMatter || !analysis?.contractPlaybook) return;
    const rows = analysis.contractPlaybook.deviations
      .map(deviation => [
        `## ${deviation.id}`,
        `Issue: ${deviation.issue}`,
        `Fallback: ${deviation.fallbackPosition}`,
        `Approvals: ${deviation.approvalRequired.join(', ') || 'None'}`
      ].join('\n'))
      .join('\n\n');
    await copyTextToClipboard([
      `# Contract Playbook: ${selectedMatter.name}`,
      '',
      analysis.contractPlaybook.negotiationSummary,
      '',
      rows || 'No deviations.'
    ].join('\n'));
    showToast('success', 'Playbook memo copied.');
  };

  const copyDecisionPacket = async () => {
    if (!analysis?.decisionPacket) return;
    await copyTextToClipboard(JSON.stringify(analysis.decisionPacket, null, 2));
    showToast('success', 'Decision packet JSON copied.');
  };

  const metrics = useMemo(() => {
    const pending = matters.filter(matter => matter.status === 'pending_review').length;
    const blocked = matters.filter(matter => matter.riskLevel === 'escalate' || matter.evidenceReadiness === 'blocked' || (matter.regulatoryMatrixGaps ?? 0) > 0).length;
    const approved = matters.filter(matter => matter.status === 'approved').length;
    const coverage = matters.length === 0 ? 100 : Math.round((approved / matters.length) * 100);
    return { pending, blocked, approved, coverage };
  }, [matters]);

  const visibleMatters = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return matters.filter(matter => {
      const statusMatches = statusFilter === 'all' || matter.status === statusFilter;
      const searchMatches = normalizedSearch.length === 0 || [
        matter.name,
        matter.id,
        matter.schemaType,
        getMatterHeadline(matter)
      ].some(value => value.toLowerCase().includes(normalizedSearch));
      return statusMatches && searchMatches;
    });
  }, [matters, searchTerm, statusFilter]);

  const canGcDecide = Boolean(userRole === 'General Counsel'
    && selectedMatter
    && selectedMatter.status !== 'approved'
    && selectedMatter.status !== 'rejected');
  const canSendToReview = Boolean(selectedMatter && selectedMatter.status === 'draft');

  return (
    <main className="workspace-shell">
      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">GC</div>
          <div>
            <h1>AI SaaS Legal Portal</h1>
            <p>Synthetic Dust GC demo</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="segmented-control" aria-label="Active role">
            {ROLE_OPTIONS.map(role => (
              <button
                key={role}
                type="button"
                className={userRole === role ? 'selected' : ''}
                onClick={() => setUserRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
          <button type="button" className="secondary-button" onClick={handleSeedData}>
            Seed Dust demo
          </button>
          <button type="button" className="primary-button" onClick={openWizard}>
            New intake
          </button>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Portfolio metrics">
        <Metric label="Open review queue" value={metrics.pending.toString()} detail="Pending reviewer action" tone="warning" />
        <Metric label="Blocked gates" value={metrics.blocked.toString()} detail="Escalated or evidence-blocked" tone="danger" />
        <Metric label="Approved matters" value={metrics.approved.toString()} detail="Final reviewer decisions" tone="success" />
        <Metric label="Approval coverage" value={`${metrics.coverage}%`} detail="Approved share of queue" tone="neutral" />
      </section>

      <section className="workflow-strip" aria-label="Workflow coverage">
        {WORKFLOWS.map(workflow => (
          <div key={workflow.type} className="workflow-item">
            <span>{workflow.shortLabel}</span>
            <strong>{workflow.owner}</strong>
          </div>
        ))}
      </section>

      <HealthStrip policyHealth={policyHealth} diagnostics={storageDiagnostics} />

      <div className="portal-layout">
        <section className="queue-panel" aria-label="Matter queue">
          <div className="panel-heading">
            <div>
              <h2>Matter Queue</h2>
              <p>{visibleMatters.length} visible of {matters.length} local matters</p>
            </div>
          </div>

          <div className="queue-toolbar">
            <input
              type="search"
              className="text-input"
              placeholder="Search matters"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
            <select
              className="select-input"
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
              aria-label="Status filter"
            >
              {STATUS_FILTERS.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All statuses' : formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          {matters.length === 0 ? (
            <div className="empty-state">
              <h3>No demo matters loaded</h3>
              <p>Load the synthetic Dust GC portfolio to review the operating model.</p>
              <button type="button" className="primary-button" onClick={handleSeedData}>
                Seed Dust demo
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="matter-table">
                <thead>
                  <tr>
                    <th>Matter</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Gate</th>
                    <th>Updated</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleMatters.map(matter => {
                    const lastAudit = matter.auditLog[matter.auditLog.length - 1];
                    const selected = selectedMatter?.id === matter.id;
                    return (
                      <tr key={matter.id} className={selected ? 'selected-row' : ''}>
                        <td>
                          <button type="button" className="matter-link" onClick={() => void selectMatter(matter)}>
                            <strong>{matter.name}</strong>
                            <span>{getMatterHeadline(matter)}</span>
                          </button>
                        </td>
                        <td><StatusBadge status={matter.status} /></td>
                        <td><RiskBadge level={matter.riskLevel ?? 'low'} /></td>
                        <td>{matter.reviewGate ?? 'self-serve'}</td>
                        <td>{formatDate(lastAudit?.timestamp)}</td>
                        <td>
                          <button
                            type="button"
                            className="text-button danger"
                            onClick={() => void handleDeleteMatter(matter.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="detail-panel" aria-label="Matter detail">
          {selectedMatter ? (
            <>
              <div className="detail-header">
                <div>
                  <p className="eyebrow">{selectedMatter.schemaType}</p>
                  <h2>{selectedMatter.name}</h2>
                  <p>{getMatterHeadline(selectedMatter)}</p>
                </div>
                <div className="badge-stack">
                  <StatusBadge status={selectedMatter.status} />
                  <RiskBadge level={analysis?.risk?.level ?? selectedMatter.riskLevel ?? 'low'} />
                </div>
              </div>

              <nav className="tabs" aria-label="Matter detail sections">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? 'active' : ''}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'plan' ? 'Action plan' : tab === 'packet' ? 'Decision packet' : tab}
                  </button>
                ))}
              </nav>

              {analysis ? (
                <div className="detail-body">
                  {activeTab === 'overview' && (
                    <OverviewTab matter={selectedMatter} analysis={analysis} />
                  )}

                  {activeTab === 'plan' && (
                    <ActionPlanTab plan={analysis.actionPlan} risk={analysis.risk} />
                  )}

                  {activeTab === 'evidence' && (
                    <EvidenceTab pack={analysis.evidencePack} onCopy={() => void copyEvidenceMemo()} />
                  )}

                  {activeTab === 'matrix' && (
                    <RegulatoryMatrixTab matrix={analysis.regulatoryMatrix} />
                  )}

                  {activeTab === 'playbook' && (
                    <PlaybookTab playbook={analysis.contractPlaybook} onCopy={() => void copyPlaybookMemo()} />
                  )}

                  {activeTab === 'packet' && (
                    <DecisionPacketTab packet={analysis.decisionPacket} onCopy={() => void copyDecisionPacket()} />
                  )}

                  {activeTab === 'history' && (
                    <AuditTab auditLog={selectedMatter.auditLog} />
                  )}

                  <div className="decision-panel">
                    <div>
                      <h3>Review Decision</h3>
                      <p>Final approval and rejection actions are restricted to the General Counsel role and require written notes.</p>
                    </div>
                    {selectedMatter.status === 'approved' || selectedMatter.status === 'rejected' ? (
                      <div className="locked-note">Final status recorded as {formatStatus(selectedMatter.status)}.</div>
                    ) : (
                      <>
                        <textarea
                          className="textarea-input"
                          rows={3}
                          placeholder="Decision rationale, conditions, evidence gaps or approved fallback position"
                          value={reviewNotes}
                          onChange={event => setReviewNotes(event.target.value)}
                        />
                        <div className="decision-actions">
                          {canSendToReview && (
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={isTransitioning}
                              onClick={() => void handleTransitionStatus('pending_review')}
                            >
                              Send to review
                            </button>
                          )}
                          <button
                            type="button"
                            className="success-button"
                            disabled={!canGcDecide || isTransitioning}
                            onClick={() => void handleTransitionStatus('approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            disabled={!canGcDecide || isTransitioning}
                            onClick={() => void handleTransitionStatus('rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state compact">
                  <p>Running deterministic analysis.</p>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state tall">
              <h3>No matter selected</h3>
              <p>Choose a matter from the queue or seed the Dust demo portfolio.</p>
            </div>
          )}
        </section>
      </div>

      {isWizardOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
          <div className="modal-panel">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Self-serve intake</p>
                <h2 id="wizard-title">New legal matter</h2>
              </div>
              <button type="button" className="text-button" onClick={() => setIsWizardOpen(false)}>
                Close
              </button>
            </div>

            <div className="wizard-layout">
              <div className="wizard-form">
                <div className="form-grid">
                  <label>
                    Matter name
                    <input
                      className="text-input"
                      value={wizardName}
                      onChange={event => setWizardName(event.target.value)}
                    />
                  </label>
                  <label>
                    Matter ID
                    <input
                      className="text-input"
                      value={wizardId}
                      onChange={event => setWizardId(event.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Workflow
                  <select
                    className="select-input"
                    value={wizardSchema}
                    onChange={event => handleSchemaChange(event.target.value as SchemaType)}
                  >
                    {WORKFLOWS.map(workflow => (
                      <option key={workflow.type} value={workflow.type}>{workflow.label}</option>
                    ))}
                  </select>
                </label>
                {wizardData ? (
                  <GuidedIntakeFields
                    template={workflowFor(wizardSchema).defaultData}
                    data={wizardData}
                    validationErrors={wizardAnalysis?.validation?.errors ?? []}
                    onChange={updateWizardField}
                  />
                ) : (
                  <p className="error-text">Guided fields are unavailable until the JSON payload parses.</p>
                )}
                <details className="advanced-json">
                  <summary>Advanced JSON editor</summary>
                  <textarea
                    className="json-input"
                    spellCheck={false}
                    rows={16}
                    value={wizardPayload}
                    onChange={event => handleWizardPayloadChange(event.target.value)}
                  />
                </details>
                <div className="decision-actions">
                  <button type="button" className="secondary-button" onClick={() => void handleSaveWizard('draft')}>
                    Save draft
                  </button>
                  <button type="button" className="primary-button" onClick={() => void handleSaveWizard('pending_review')}>
                    Submit to review
                  </button>
                </div>
              </div>

              <aside className="wizard-analysis">
                <h3>Live triage</h3>
                {wizardError ? (
                  <p className="error-text">{wizardError}</p>
                ) : wizardAnalysis ? (
                  <>
                    <div className="summary-list">
                      <span>Risk</span>
                      <strong><RiskBadge level={wizardAnalysis.risk?.level ?? 'low'} /></strong>
                      <span>Review gate</span>
                      <strong>{wizardAnalysis.actionPlan?.reviewGate}</strong>
                      <span>Evidence</span>
                      <strong>{wizardAnalysis.evidencePack?.readiness}</strong>
                      <span>Matrix gaps</span>
                      <strong>{wizardAnalysis.regulatoryMatrix?.gaps.length ?? 0}</strong>
                    </div>
                    {wizardAnalysis.validation && !wizardAnalysis.validation.valid && (
                      <>
                        <h4>Validation summary</h4>
                        <ul className="plain-list">
                          {(wizardAnalysis.validation.errors ?? []).map(error => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <h4>Trigger reasons</h4>
                    <ul className="plain-list">
                      {wizardAnalysis.risk?.reasons.map(reason => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>Waiting for analysis.</p>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

