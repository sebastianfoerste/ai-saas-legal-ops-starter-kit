'use client';

type MatterStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
type RiskLevel = 'low' | 'medium' | 'high' | 'escalate';
type ReviewGate = 'self-serve' | 'legal-review' | 'senior-legal-review' | 'gc-review';
type EvidenceReadiness = 'ready' | 'review_needed' | 'blocked';
type RegulatoryReadiness = 'satisfied' | 'needs_review' | 'missing' | 'not_applicable';
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
  schemaType: string;
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
  requiredReviewerRoles: RequiredReviewerRole[];
  blockers: string[];
  followUps: string[];
  evidenceToCollect: string[];
}

interface RequiredReviewerRole {
  approval: string;
  role: string;
  label: string;
  reason: string;
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

interface EvidencePack {
  readiness: EvidenceReadiness;
  items: EvidenceItem[];
  missingEvidence: EvidenceItem[];
  requiredApprovals: string[];
  humanReviewRequired: boolean;
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

export function Metric(props: { label: string; value: string; detail: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return (
    <div className={`metric-card ${props.tone}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.detail}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: MatterStatus }) {
  return <span className={`status-badge ${status}`}>{formatStatus(status)}</span>;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`risk-badge ${level}`}>{level}</span>;
}

export function GuidedIntakeFields({
  template,
  data,
  validationErrors,
  onChange
}: {
  template: MatterData;
  data: MatterData;
  validationErrors: string[];
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <section className="guided-fields" aria-label="Guided intake fields">
      {Object.keys(template).map(field => {
        const value = data[field] ?? template[field];
        const errors = validationErrors.filter(error => error.toLowerCase().includes(`'${field.toLowerCase()}'`));
        return (
          <label key={field} className="guided-field">
            <span>{humanizeField(field)}</span>
            <GuidedFieldControl field={field} value={value} onChange={onChange} />
            {errors.length > 0 && (
              <small className="field-error">{errors.join(' ')}</small>
            )}
          </label>
        );
      })}
    </section>
  );
}

export function HealthStrip({ policyHealth, diagnostics }: { policyHealth: PolicyHealth | null; diagnostics: StorageDiagnostic[] }) {
  if (!policyHealth && diagnostics.length === 0) return null;
  const policyTone = policyHealth?.status === 'valid' || policyHealth?.status === 'missing' ? 'success' : 'danger';
  return (
    <section className="health-strip" aria-label="System health">
      {policyHealth && (
        <div className={`health-item ${policyTone}`}>
          <span>Policy health</span>
          <strong>{policyHealth.status}</strong>
          <p>{policyHealth.loadedRules} custom {policyHealth.loadedRules === 1 ? 'rule' : 'rules'} loaded</p>
        </div>
      )}
      {diagnostics.length > 0 && (
        <div className="health-item danger">
          <span>Storage diagnostics</span>
          <strong>{diagnostics.length}</strong>
          <p>{diagnostics[0]?.reason}</p>
        </div>
      )}
    </section>
  );
}

export function OverviewTab({ matter, analysis }: { matter: PersistedMatter; analysis: AnalysisResult }) {
  const validationErrors = analysis.validation?.errors ?? [];
  return (
    <div className="stack">
      <div className="summary-list">
        <span>Validation</span>
        <strong>{analysis.validation?.valid ? 'Schema valid' : 'Schema errors'}</strong>
        <span>Risk level</span>
        <strong><RiskBadge level={analysis.risk?.level ?? 'low'} /></strong>
        <span>Review gate</span>
        <strong>{analysis.actionPlan?.reviewGate ?? 'self-serve'}</strong>
        <span>Evidence readiness</span>
        <strong>{analysis.evidencePack?.readiness ?? 'ready'}</strong>
      </div>

      {validationErrors.length > 0 && (
        <section className="issue-section">
          <h3>Validation issues</h3>
          <ul className="plain-list">
            {validationErrors.map(error => <li key={error}>{error}</li>)}
          </ul>
        </section>
      )}

      <section className="issue-section">
        <h3>Risk reasons</h3>
        <ul className="plain-list">
          {analysis.risk?.reasons.map(reason => <li key={reason}>{reason}</li>)}
        </ul>
      </section>

      <section className="issue-section">
        <h3>Source payload</h3>
        <pre className="json-block">{JSON.stringify(matter.data, null, 2)}</pre>
      </section>
    </div>
  );
}

export function ActionPlanTab({ plan, risk }: { plan?: LegalActionPlan; risk?: RiskAssessment }) {
  if (!plan) return <p>No action plan generated.</p>;
  return (
    <div className="stack">
      <div className="summary-list">
        <span>Priority</span>
        <strong>{plan.priority}</strong>
        <span>Review gate</span>
        <strong>{plan.reviewGate}</strong>
        <span>Risk</span>
        <strong><RiskBadge level={risk?.level ?? 'low'} /></strong>
      </div>
      <section className="issue-section">
        <h3>Summary</h3>
        <p>{plan.summary}</p>
      </section>
      <section className="issue-section highlight">
        <h3>Next action</h3>
        <p>{plan.nextAction}</p>
      </section>
      <section className="issue-section">
        <h3>Reviewer queue</h3>
        <div className="task-list">
          {plan.requiredReviewerRoles.length > 0 ? (
            plan.requiredReviewerRoles.map(item => (
              <article key={`${item.role}:${item.approval}`} className="task-row">
                <label>
                  <input type="checkbox" disabled />
                  <span>{item.label}</span>
                </label>
                <p>{item.approval}</p>
              </article>
            ))
          ) : (
            <p>No role-gated approvals.</p>
          )}
        </div>
      </section>
      <ListSection title="Required approvals" values={plan.requiredApprovals} />
      <ListSection title="Blockers" values={plan.blockers} empty="No blockers." />
      <ListSection title="Follow-ups" values={plan.followUps} />
      <ListSection title="Evidence to collect" values={plan.evidenceToCollect} />
    </div>
  );
}

export function EvidenceTab({ pack, onCopy }: { pack?: EvidencePack; onCopy: () => void }) {
  if (!pack) return <p>No evidence pack generated.</p>;
  return (
    <div className="stack">
      <div className="split-heading">
        <div className="summary-list">
          <span>Readiness</span>
          <strong>{pack.readiness}</strong>
          <span>Open evidence</span>
          <strong>{pack.missingEvidence.length}</strong>
          <span>Human review</span>
          <strong>{pack.humanReviewRequired ? 'Required' : 'Self-serve'}</strong>
        </div>
        <button type="button" className="secondary-button" onClick={onCopy}>Copy memo</button>
      </div>

      {pack.missingEvidence.length > 0 && (
        <section className="issue-section">
          <h3>Evidence tasks</h3>
          <div className="task-list">
            {pack.missingEvidence.map(item => (
              <article key={item.id} className="task-row">
                <label>
                  <input type="checkbox" />
                  <span>{item.title}</span>
                </label>
                <p>{item.evidenceRequired.join('; ')}</p>
                <small>{item.framework} | {item.priority} | Legal Operations</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="evidence-list">
        {pack.items.map(item => (
          <article key={item.id} className="evidence-row">
            <div>
              <strong>{item.title}</strong>
              <span>{item.framework} | {item.priority} | {item.status}</span>
            </div>
            <p>{item.evidenceRequired.join('; ')}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function RegulatoryMatrixTab({ matrix }: { matrix?: RegulatoryMatrix }) {
  if (!matrix) return <p>No regulatory matrix generated.</p>;
  return (
    <div className="stack">
      <div className="summary-list">
        <span>Rows</span>
        <strong>{matrix.rows.length}</strong>
        <span>Open gaps</span>
        <strong>{matrix.gaps.length}</strong>
        <span>Human review</span>
        <strong>{matrix.humanReviewRequired ? 'Required' : 'Self-serve'}</strong>
      </div>

      {matrix.gaps.length > 0 && (
        <section className="issue-section">
          <h3>Matrix tasks</h3>
          <div className="task-list">
            {matrix.gaps.map(row => (
              <article key={row.id} className="task-row">
                <label>
                  <input type="checkbox" />
                  <span>{row.obligation}</span>
                </label>
                <p>{row.evidenceRequired.join('; ')}</p>
                <small>{row.framework} | {row.readiness} | {row.owner}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="matrix-table-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Obligation</th>
              <th>Framework</th>
              <th>Readiness</th>
              <th>Owner</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map(row => (
              <tr key={row.id}>
                <td>
                  <strong>{row.obligation}</strong>
                  <span>{row.trigger}</span>
                </td>
                <td>{row.framework}</td>
                <td><span className={`readiness-badge ${row.readiness}`}>{row.readiness}</span></td>
                <td>{row.owner}</td>
                <td>{row.evidenceRequired.join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="notice-text">{matrix.humanReviewNotice}</p>
    </div>
  );
}

export function PlaybookTab({ playbook, onCopy }: { playbook?: ContractPlaybook; onCopy: () => void }) {
  if (!playbook) return <p>No contract playbook applies to this matter.</p>;
  return (
    <div className="stack">
      <div className="split-heading">
        <div>
          <h3>Negotiation summary</h3>
          <p>{playbook.negotiationSummary}</p>
        </div>
        <button type="button" className="secondary-button" onClick={onCopy}>Copy memo</button>
      </div>
      <ListSection title="Non-starters" values={playbook.nonStarters.map(item => item.issue)} empty="No non-starters." />
      <ListSection title="Approvals" values={playbook.approvalRequired} />
      <div className="evidence-list">
        {playbook.deviations.map(deviation => (
          <article key={deviation.id} className="evidence-row">
            <div>
              <strong>{deviation.issue}</strong>
              <span>{deviation.category} | {deviation.severity}</span>
            </div>
            <p>{deviation.fallbackPosition}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function DecisionPacketTab({ packet, onCopy }: { packet?: DecisionPacket; onCopy: () => void }) {
  if (!packet) return <p>No decision packet generated.</p>;
  return (
    <div className="stack">
      <div className="split-heading">
        <div>
          <h3>Integrity evidence</h3>
          <p className="notice-text">Generated {formatDate(packet.generatedAt)} for {packet.matterName}</p>
        </div>
        <button type="button" className="secondary-button" onClick={onCopy}>Copy packet JSON</button>
      </div>
      <div className="summary-list">
        <span>Algorithm</span>
        <strong>{packet.integrityManifest.algorithm}</strong>
        <span>Sections</span>
        <strong>{packet.integrityManifest.sections.length}</strong>
        <span>Overall digest</span>
        <strong className="digest-text">{packet.integrityManifest.overallDigest}</strong>
      </div>
      <div className="matrix-table-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {packet.integrityManifest.sections.map(section => (
              <tr key={section.section}>
                <td>{section.section}</td>
                <td className="digest-text">{section.digest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="notice-text">{packet.humanReviewNotice}</p>
    </div>
  );
}

export function AuditTab({ auditLog }: { auditLog: AuditEvent[] }) {
  return (
    <div className="audit-list">
      {auditLog.map((event, index) => (
        <article key={`${event.timestamp}-${index}`} className="audit-row">
          <div>
            <strong>{event.action}</strong>
            <span>{formatDate(event.timestamp)}</span>
          </div>
          <p>{event.actor}</p>
          <p>{event.notes}</p>
        </article>
      ))}
    </div>
  );
}

function ListSection({ title, values, empty = 'None.' }: { title: string; values: string[]; empty?: string }) {
  return (
    <section className="issue-section">
      <h3>{title}</h3>
      {values.length > 0 ? (
        <ul className="plain-list">
          {values.map(value => <li key={value}>{value}</li>)}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function GuidedFieldControl({
  field,
  value,
  onChange
}: {
  field: string;
  value: unknown;
  onChange: (field: string, value: unknown) => void;
}) {
  if (typeof value === 'boolean') {
    return (
      <span className="toggle-row">
        <input
          type="checkbox"
          checked={value}
          onChange={event => onChange(field, event.target.checked)}
        />
        <span>{value ? 'Yes' : 'No'}</span>
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.some(item => typeof item !== 'string')) {
      return (
        <textarea
          className="json-input compact"
          rows={7}
          defaultValue={JSON.stringify(value, null, 2)}
          key={`${field}-${value ? JSON.stringify(value) : ''}`}
          onBlur={event => {
            try {
              const parsed = JSON.parse(event.target.value);
              if (Array.isArray(parsed)) {
                onChange(field, parsed);
              }
            } catch {
              // Keep previous value
            }
          }}
        />
      );
    }

    return (
      <textarea
        className="textarea-input"
        rows={Math.min(8, Math.max(3, value.length + 1))}
        value={value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n')}
        onChange={event => onChange(field, event.target.value.split('\n').map(item => item.trim()).filter(Boolean))}
      />
    );
  }

  if (value && typeof value === 'object') {
    return (
      <textarea
        className="json-input compact"
        rows={5}
        defaultValue={JSON.stringify(value, null, 2)}
        key={`${field}-${value ? JSON.stringify(value) : ''}`}
        onBlur={event => {
          try {
            const parsed = JSON.parse(event.target.value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              onChange(field, parsed);
            }
          } catch {
            // Keep previous value
          }
        }}
      />
    );
  }

  const stringValue = value === undefined || value === null ? '' : String(value);
  const isDate = field.toLowerCase().includes('date') || /^\d{4}-\d{2}-\d{2}$/.test(stringValue);
  const isLong = stringValue.length > 90 || ['commitment', 'legalQuestion', 'businessPosition', 'privacyImpact', 'contractImpact', 'regulatoryImpact', 'requiredAction', 'useCase', 'outputUse'].includes(field);

  if (isLong) {
    return (
      <textarea
        className="textarea-input"
        rows={3}
        value={stringValue}
        onChange={event => onChange(field, event.target.value)}
      />
    );
  }

  return (
    <input
      className="text-input"
      type={isDate ? 'date' : 'text'}
      value={stringValue}
      onChange={event => onChange(field, event.target.value)}
    />
  );
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

function humanizeField(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, first => first.toUpperCase());
}
