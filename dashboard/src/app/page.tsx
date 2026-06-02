'use client';

import React, { useState, useEffect } from 'react';

// Matter structure matching persistence
interface PersistedMatter {
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

interface AnalysisResult {
  validation?: {
    valid: boolean;
    errors: string[];
  };
  risk?: {
    level: 'low' | 'medium' | 'high' | 'escalate';
    reasons: string[];
    score: number;
    blockerCount: number;
  };
  actionPlan?: {
    summary: string;
    nextAction: string;
    reviewGate: string;
    priority: string;
    requiredApprovals: string[];
    blockers: string[];
    followUps: string[];
    evidenceToCollect: string[];
  };
  evidencePack?: {
    readiness: 'green' | 'amber' | 'blocked';
    missingEvidence: string[];
    collectedEvidence: string[];
  };
  contractPlaybook?: {
    deviations: {
      clause: string;
      standard: string;
      current: string;
      deviationType: string;
      remediation: string;
    }[];
    nonStarters: string[];
  };
}

export default function Dashboard() {
  const [matters, setMatters] = useState<PersistedMatter[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<PersistedMatter | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'plan' | 'evidence' | 'playbook' | 'history'>('overview');
  
  // App-wide state
  const [userRole, setUserRole] = useState<'Sales Sponsor' | 'DPO Reviewer' | 'General Counsel'>('Sales Sponsor');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Wizard state
  const [wizardSchema, setWizardSchema] = useState<string>('SaaSContractIntake');
  const [wizardName, setWizardName] = useState('');
  const [wizardId, setWizardId] = useState('');
  const [wizardData, setWizardData] = useState<any>({});
  const [wizardAnalysis, setWizardAnalysis] = useState<AnalysisResult | null>(null);
  
  // Transition Form state
  const [transitionNotes, setTransitionNotes] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch matters
  const fetchMatters = async () => {
    try {
      const res = await fetch('/api/matters');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMatters(data);
      }
    } catch (e) {
      showToast('error', 'Failed to retrieve matters from persistence.');
    }
  };

  useEffect(() => {
    fetchMatters();
  }, []);

  // Fetch specific matter analysis details
  const selectMatter = async (matter: PersistedMatter) => {
    setSelectedMatter(matter);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/matters/${matter.id}`);
      const result = await res.json();
      if (res.ok) {
        setAnalysis(result);
      } else {
        showToast('error', result.error || 'Failed to analyze matter.');
      }
    } catch (e) {
      showToast('error', 'Error reaching analysis server.');
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSeedData = async () => {
    try {
      const res = await fetch('/api/matters/seed', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        showToast('success', `Initialized ${result.seeded.length} matters from template examples.`);
        fetchMatters();
      } else {
        showToast('error', result.error || 'Failed to seed data.');
      }
    } catch (e) {
      showToast('error', 'Error communicating with seeding API.');
    }
  };

  // Status transitions
  const handleTransitionStatus = async (status: 'approved' | 'rejected' | 'pending_review') => {
    if (!selectedMatter) return;
    if (!transitionNotes.trim()) {
      showToast('error', 'Please provide notes/justification for status change.');
      return;
    }
    
    setIsTransitioning(true);
    try {
      const res = await fetch(`/api/matters/${selectedMatter.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          actor: `${userRole} User`,
          notes: transitionNotes
        })
      });
      const result = await res.json();
      if (res.ok) {
        showToast('success', `Matter transitioned successfully to ${status}.`);
        setTransitionNotes('');
        // Refresh detail and list
        await fetchMatters();
        // Update selectedMatter view
        const updatedRes = await fetch(`/api/matters/${selectedMatter.id}`);
        const updatedData = await updatedRes.json();
        setSelectedMatter(updatedData.matter);
        setAnalysis(updatedData);
      } else {
        showToast('error', result.error || 'Transition failed.');
      }
    } catch (e) {
      showToast('error', 'Network error while attempting transition.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleDeleteMatter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this matter?')) return;
    try {
      const res = await fetch(`/api/matters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Matter deleted.');
        if (selectedMatter?.id === id) {
          setSelectedMatter(null);
          setAnalysis(null);
        }
        fetchMatters();
      } else {
        showToast('error', 'Delete failed.');
      }
    } catch (e) {
      showToast('error', 'Network error during delete.');
    }
  };

  // Wizard logic
  const openWizard = () => {
    setWizardName('');
    const genId = 'matter-' + Math.random().toString(36).substr(2, 6);
    setWizardId(genId);
    setWizardSchema('SaaSContractIntake');
    const initData = getInitialWizardData('SaaSContractIntake');
    setWizardData(initData);
    setWizardAnalysis(null);
    setIsWizardOpen(true);
    runLiveAnalysis('SaaSContractIntake', initData);
  };

  const handleSchemaChange = (schema: string) => {
    setWizardSchema(schema);
    const initData = getInitialWizardData(schema);
    setWizardData(initData);
    runLiveAnalysis(schema, initData);
  };

  const handleWizardFieldChange = (key: string, value: any) => {
    const updated = { ...wizardData, [key]: value };
    setWizardData(updated);
    runLiveAnalysis(wizardSchema, updated);
  };

  const handleWizardArrayToggle = (key: string, item: string) => {
    const current = wizardData[key] || [];
    const updated = current.includes(item)
      ? current.filter((x: string) => x !== item)
      : [...current, item];
    const newData = { ...wizardData, [key]: updated };
    setWizardData(newData);
    runLiveAnalysis(wizardSchema, newData);
  };

  const runLiveAnalysis = async (schema: string, data: any) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaType: schema, data })
      });
      if (res.ok) {
        const result = await res.json();
        setWizardAnalysis(result);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveWizard = async () => {
    if (!wizardName.trim() || !wizardId.trim()) {
      showToast('error', 'Please fill in Name and ID.');
      return;
    }
    try {
      const res = await fetch('/api/matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: wizardId,
          name: wizardName,
          schemaType: wizardSchema,
          data: wizardData,
          status: 'draft',
          actor: `${userRole} User`,
          notes: 'Self-serve wizard intake creation'
        })
      });
      const result = await res.json();
      if (res.ok) {
        showToast('success', `Intake submitted successfully.`);
        setIsWizardOpen(false);
        fetchMatters();
        // Automatically select the newly created matter
        if (result.matter) {
          selectMatter(result.matter);
        }
      } else {
        showToast('error', result.error || 'Failed to save matter.');
      }
    } catch (e) {
      showToast('error', 'Error connecting to save API.');
    }
  };

  // Helper values for fields
  const getInitialWizardData = (schema: string) => {
    switch (schema) {
      case 'SaaSContractIntake':
        return {
          customer: 'Acme Corp',
          requestOwner: 'Sponsor User',
          contractType: 'MSA',
          dealStage: 'Negotiation',
          requestedDeadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          regulatedCustomer: false,
          customerSector: 'technology',
          dataCategories: [],
          aiFeaturesInvolved: []
        };
      case 'DPATriage':
        return {
          vendor: 'CloudStore Inc',
          purpose: 'Data storage hosting backup services',
          personalDataCategories: ['emails'],
          crossBorderTransfer: false,
          subprocessorsInvolved: false,
          dpoSignoffRequired: false
        };
      case 'AIVendorReview':
        return {
          vendor: 'ChatGen AI',
          tool: 'Copilot Assistant',
          dataUsageModel: 'inference_only',
          trainingOptOut: true,
          copyrightIndemnity: false,
          securityCertification: 'SOC2'
        };
      case 'OpenSourceReview':
        return {
          dependencyName: 'fast-logger-sdk',
          licence: 'MIT',
          distributionModel: 'SaaS',
          modificationPlanned: false,
          commercialUseAllowed: true
        };
      case 'CustomerCommitment':
        return {
          customer: 'Enterprise Group Inc',
          commitment: '99.9% custom SLA guarantee rider',
          sourceDocument: 'MSA Addendum A',
          slaUptimeGuarantees: 99.9,
          liquidatedDamagesApplies: false,
          approvedByGC: false
        };
      case 'ProductLaunchIntake':
        return {
          featureName: 'AI Loan Triaging Assistant',
          description: 'Automates customer credit assessment and scoring model pipelines',
          targetDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          involvesAI: true,
          highRiskAITriage: true,
          requiresPrivacyReview: true
        };
      default:
        return {};
    }
  };

  // Render helpers
  const renderRiskPill = (level: string) => {
    const cl = level === 'low' ? 'risk-low' : level === 'medium' ? 'risk-medium' : level === 'high' ? 'risk-high' : 'risk-escalate';
    return <span className={`risk-badge ${cl}`}>{level}</span>;
  };

  const renderStatusBadge = (status: string) => {
    const label = status === 'pending_review' ? 'Pending Review' : status;
    const cl = status === 'pending_review' ? 'status-pending' : `status-${status}`;
    return <span className={`status-badge ${cl}`}>{label}</span>;
  };

  // Metrics calculators
  const pendingCount = matters.filter(m => m.status === 'pending_review').length;
  const draftCount = matters.filter(m => m.status === 'draft').length;
  const approvedCount = matters.filter(m => m.status === 'approved').length;
  
  return (
    <div className="app-container">
      {/* Toast Notifier */}
      {toast && (
        <div className="toast-banner">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.message}
          </div>
        </div>
      )}

      {/* Title Tags & Header */}
      <header className="app-header" id="main-header">
        <div className="logo-section">
          <div className="logo-icon">§</div>
          <div>
            <h1 className="logo-text">StrategyOS</h1>
            <span className="logo-tag">Legal Operations Engine</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {matters.length === 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleSeedData} id="seed-btn">
              ⚡ Seed Example Matters
            </button>
          )}
          
          {/* User Role Toggle */}
          <div className="role-badge-container" id="role-container">
            <span className="role-label">Act as:</span>
            <select
              className="role-select"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              id="role-selector"
            >
              <option value="Sales Sponsor">Sales Sponsor / Product Owner</option>
              <option value="DPO Reviewer">Privacy / DPO Reviewer</option>
              <option value="General Counsel">General Counsel (GC)</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={openWizard} id="new-intake-btn">
            + New Intake Matter
          </button>
        </div>
      </header>

      {/* Metrics Cards */}
      <section className="metrics-grid" aria-label="Key Performance Indicators" id="kpi-section">
        <div className="glass-panel metric-card info" id="metric-total">
          <div className="metric-header">
            <span className="metric-title">Total Ingested</span>
            <span className="metric-icon">📁</span>
          </div>
          <span className="metric-value">{matters.length}</span>
          <span className="metric-sub">{draftCount} drafts in preparation</span>
        </div>

        <div className="glass-panel metric-card warning" id="metric-pending">
          <div className="metric-header">
            <span className="metric-title">Pending Review</span>
            <span className="metric-icon">⏳</span>
          </div>
          <span className="metric-value">{pendingCount}</span>
          <span className="metric-sub">Requires Legal or DPO Sign-off</span>
        </div>

        <div className="glass-panel metric-card success" id="metric-approved">
          <div className="metric-header">
            <span className="metric-title">Approved Releases</span>
            <span className="metric-icon">✅</span>
          </div>
          <span className="metric-value">{approvedCount}</span>
          <span className="metric-sub">Compliant & Safe to Launch</span>
        </div>

        <div className="glass-panel metric-card danger" id="metric-escalations">
          <div className="metric-header">
            <span className="metric-title">Compliance Index</span>
            <span className="metric-icon">⚖️</span>
          </div>
          <span className="metric-value">
            {matters.length > 0
              ? `${Math.round((approvedCount / matters.length) * 100)}%`
              : '100%'}
          </span>
          <span className="metric-sub">Proportion of approved intakes</span>
        </div>
      </section>

      {/* Split Layout: Matters list & detail panel */}
      <div className="dashboard-layout" id="main-dashboard-body">
        {/* Left Side: Matters list */}
        <section className="glass-panel" id="matters-list-panel" aria-label="Matters Queue">
          <div className="section-header">
            <h2 className="section-title">📂 Active Intake Matters</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Select a matter to run playbook checks & audits
            </span>
          </div>

          {matters.length === 0 ? (
            <div className="chart-placeholder" style={{ padding: '40px', textAlign: 'center', flexDirection: 'column', gap: '16px' }} id="empty-state">
              <span>No matters saved in persistent storage database (.storage/matters/).</span>
              <button className="btn btn-primary" onClick={handleSeedData}>
                ⚡ Load Bundled Matters Examples
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" id="matters-table">
                <thead>
                  <tr>
                    <th>Matter Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Last Event</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matters.map((m) => {
                    const lastAudit = m.auditLog[m.auditLog.length - 1];
                    const timeString = lastAudit
                      ? new Date(lastAudit.timestamp).toLocaleDateString()
                      : 'N/A';
                    const isSelected = selectedMatter?.id === m.id;
                    return (
                      <tr
                        key={m.id}
                        onClick={() => selectMatter(m)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(99, 102, 241, 0.08)' : '',
                          borderColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : ''
                        }}
                        className="matter-row"
                        id={`row-${m.id}`}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {m.id}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.schemaType}</span>
                        </td>
                        <td>{renderStatusBadge(m.status)}</td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>{lastAudit?.action || 'Created'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{timeString}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMatter(m.id);
                            }}
                            id={`del-btn-${m.id}`}
                          >
                            🗑️
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

        {/* Right Side: Analysis & Details */}
        <section className="glass-panel" id="matter-details-panel" aria-label="Audit Details">
          {selectedMatter ? (
            <div>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 className="section-title" id="detail-title">{selectedMatter.name}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ID: {selectedMatter.id} • Type: {selectedMatter.schemaType}
                    </span>
                  </div>
                  <div>
                    {renderStatusBadge(selectedMatter.status)}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs-header" id="details-tabs">
                <button
                  className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                  id="tab-btn-overview"
                >
                  Overview
                </button>
                <button
                  className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
                  onClick={() => setActiveTab('plan')}
                  id="tab-btn-plan"
                >
                  Action Plan
                </button>
                <button
                  className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                  onClick={() => setActiveTab('evidence')}
                  id="tab-btn-evidence"
                >
                  Evidence Pack
                </button>
                {selectedMatter.schemaType === 'SaaSContractIntake' && (
                  <button
                    className={`tab-btn ${activeTab === 'playbook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('playbook')}
                    id="tab-btn-playbook"
                  >
                    Playbook
                  </button>
                )}
                <button
                  className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                  id="tab-btn-history"
                >
                  Audit Trail
                </button>
              </div>

              {/* Tab Contents */}
              <div style={{ minHeight: '300px' }} id="tab-content-box">
                {analysis ? (
                  <>
                    {/* Tab: Overview */}
                    {activeTab === 'overview' && (
                      <div className="detail-section" id="section-overview">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-item-title">Risk Assessment</span>
                            <div className="detail-item-value" style={{ marginTop: '4px' }}>
                              {renderRiskPill(analysis.risk?.level || 'low')}
                            </div>
                          </div>
                          <div className="detail-item">
                            <span className="detail-item-title">Compliance Gate</span>
                            <div className="detail-item-value" style={{ fontWeight: 600 }}>
                              {analysis.actionPlan?.reviewGate || 'No Review Gate'}
                            </div>
                          </div>
                        </div>

                        <div className="detail-item">
                          <span className="detail-item-title">Data Validation</span>
                          <div className="detail-item-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {analysis.validation?.valid ? (
                              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✅ JSON Schema Valid</span>
                            ) : (
                              <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                                <div>❌ Schema Violations Found:</div>
                                <ul style={{ marginLeft: '16px', fontSize: '0.8rem', fontWeight: 400 }}>
                                  {analysis.validation?.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="detail-item">
                          <span className="detail-item-title">Scoring Reasons ({analysis.risk?.reasons.length || 0})</span>
                          <div className="detail-item-value" style={{ fontSize: '0.85rem' }}>
                            {analysis.risk?.reasons && analysis.risk.reasons.length > 0 ? (
                              <ul style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {analysis.risk.reasons.map((r, idx) => (
                                  <li key={idx} style={{ color: 'var(--text-secondary)' }}>{r}</li>
                                ))}
                              </ul>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No high risk indicators identified.</span>
                            )}
                          </div>
                        </div>

                        {/* Intake Data Dump */}
                        <div className="detail-item">
                          <span className="detail-item-title">Intake JSON Data Payload</span>
                          <pre style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            overflowX: 'auto',
                            marginTop: '6px',
                            border: '1px solid var(--glass-border)',
                            color: '#a5b4fc',
                            maxHeight: '200px'
                          }}>
                            {JSON.stringify(selectedMatter.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Tab: Action Plan */}
                    {activeTab === 'plan' && (
                      <div className="detail-section" id="section-plan">
                        <div className="detail-item">
                          <span className="detail-item-title">Executive Summary</span>
                          <div className="detail-item-value" style={{ color: 'var(--text-secondary)' }}>
                            {analysis.actionPlan?.summary}
                          </div>
                        </div>
                        <div className="detail-item" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--color-brand)' }}>
                          <span className="detail-item-title" style={{ color: '#a5b4fc' }}>Next Action Required</span>
                          <div className="detail-item-value" style={{ fontWeight: 600, color: 'white' }}>
                            {analysis.actionPlan?.nextAction}
                          </div>
                        </div>

                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-item-title">Required Approvals</span>
                            <div className="detail-item-value">
                              {analysis.actionPlan?.requiredApprovals && analysis.actionPlan.requiredApprovals.length > 0 ? (
                                <ul style={{ marginLeft: '16px', fontSize: '0.85rem' }}>
                                  {analysis.actionPlan.requiredApprovals.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None required.</span>
                              )}
                            </div>
                          </div>

                          <div className="detail-item">
                            <span className="detail-item-title">Identified Blockers</span>
                            <div className="detail-item-value">
                              {analysis.actionPlan?.blockers && analysis.actionPlan.blockers.length > 0 ? (
                                <ul style={{ marginLeft: '16px', fontSize: '0.85rem', color: 'var(--color-danger)' }}>
                                  {analysis.actionPlan.blockers.map((b, i) => <li key={i}>{b}</li>)}
                                </ul>
                              ) : (
                                <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>None.</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="detail-item">
                          <span className="detail-item-title">Mitigation & Follow-Ups</span>
                          <div className="detail-item-value">
                            {analysis.actionPlan?.followUps && analysis.actionPlan.followUps.length > 0 ? (
                              <ul style={{ marginLeft: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {analysis.actionPlan.followUps.map((f, i) => <li key={i}>{f}</li>)}
                              </ul>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No pending follow-ups.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab: Evidence Pack */}
                    {activeTab === 'evidence' && (
                      <div className="detail-section" id="section-evidence">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="detail-item-title">Governance Status</span>
                          <span className={`status-badge ${analysis.evidencePack?.readiness === 'green' ? 'status-approved' : analysis.evidencePack?.readiness === 'amber' ? 'status-pending' : 'status-rejected'}`}>
                            {analysis.evidencePack?.readiness.toUpperCase()}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-item-title">Collected Evidence Items</span>
                          <div className="detail-item-value">
                            {analysis.evidencePack?.collectedEvidence && analysis.evidencePack.collectedEvidence.length > 0 ? (
                              <ul style={{ marginLeft: '16px', fontSize: '0.85rem', color: 'var(--color-success)' }}>
                                {analysis.evidencePack.collectedEvidence.map((e, idx) => <li key={idx}>✓ {e}</li>)}
                              </ul>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No evidence collected yet.</span>
                            )}
                          </div>
                        </div>

                        <div className="detail-item" style={{ background: 'rgba(239, 68, 68, 0.04)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                          <span className="detail-item-title" style={{ color: '#f87171' }}>Missing / Required Evidence Items</span>
                          <div className="detail-item-value" style={{ marginTop: '6px' }}>
                            {analysis.evidencePack?.missingEvidence && analysis.evidencePack.missingEvidence.length > 0 ? (
                              <ul style={{ marginLeft: '16px', fontSize: '0.85rem', color: '#fca5a5' }}>
                                {analysis.evidencePack.missingEvidence.map((e, idx) => <li key={idx}>⚠️ {e}</li>)}
                              </ul>
                            ) : (
                              <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>All compliance evidence items collected!</span>
                            )}
                          </div>
                        </div>

                        {/* Export Button */}
                        <div style={{ marginTop: '16px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              const content = `# Evidence Pack: ${selectedMatter.name}\nGenerated At: ${new Date().toISOString()}\nReadiness: ${analysis.evidencePack?.readiness}\n\nCollected Evidence:\n${analysis.evidencePack?.collectedEvidence.map(e => `- [x] ${e}`).join('\n')}\n\nMissing Evidence:\n${analysis.evidencePack?.missingEvidence.map(e => `- [ ] ${e}`).join('\n')}`;
                              navigator.clipboard.writeText(content);
                              showToast('success', 'Evidence Pack markdown report copied to clipboard.');
                            }}
                            id="export-evidence-btn"
                          >
                            📋 Copy Evidence Pack Memo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tab: Playbook */}
                    {activeTab === 'playbook' && analysis.contractPlaybook && (
                      <div className="detail-section" id="section-playbook">
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Contract Playbook Deviation Report</h3>
                        
                        {analysis.contractPlaybook.nonStarters.length > 0 && (
                          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                            <strong>🚨 NON-STARTER ISSUES DETECTED:</strong>
                            <ul style={{ marginLeft: '16px', marginTop: '6px' }}>
                              {analysis.contractPlaybook.nonStarters.map((ns, idx) => <li key={idx}>{ns}</li>)}
                            </ul>
                          </div>
                        )}

                        <div>
                          <span className="detail-item-title">Clause Deviations ({analysis.contractPlaybook.deviations.length})</span>
                          <div style={{ marginTop: '8px' }}>
                            {analysis.contractPlaybook.deviations.map((dev, idx) => (
                              <div className="deviation-card" key={idx}>
                                <div className="deviation-header">
                                  <span>Clause: {dev.clause}</span>
                                  <span className="risk-badge risk-high" style={{ fontSize: '0.65rem' }}>{dev.deviationType}</span>
                                </div>
                                <div className="deviation-body">
                                  <div><strong>Standard:</strong> {dev.standard}</div>
                                  <div><strong>Proposed:</strong> {dev.current}</div>
                                </div>
                                <div className="deviation-remediation">
                                  <strong>Remediation Option:</strong> {dev.remediation}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Export Button */}
                        <div>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              const content = `# Playbook Review: ${selectedMatter.name}\nGenerated At: ${new Date().toISOString()}\nNon-starters: ${analysis.contractPlaybook?.nonStarters.join(', ') || 'None'}\n\nDeviations:\n${analysis.contractPlaybook?.deviations.map(d => `## Clause: ${d.clause}\n- Standard: ${d.standard}\n- Current: ${d.current}\n- Remediation: ${d.remediation}`).join('\n\n')}`;
                              navigator.clipboard.writeText(content);
                              showToast('success', 'Playbook review report copied to clipboard.');
                            }}
                            id="export-playbook-btn"
                          >
                            📋 Copy Playbook Memo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tab: Audit History */}
                    {activeTab === 'history' && (
                      <div className="detail-section" id="section-history">
                        <span className="detail-item-title">Audit Trail & Activity Logs</span>
                        <div className="audit-list">
                          {selectedMatter.auditLog.map((log, idx) => (
                            <div className="audit-item" key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="audit-action">{log.action}</span>
                                <span className="audit-time">{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <span className="audit-actor">Actor: <strong>{log.actor}</strong></span>
                              {log.notes && <div className="audit-notes">“{log.notes}”</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Form Panel - Human In The Loop */}
                    {selectedMatter.status !== 'approved' && selectedMatter.status !== 'rejected' ? (
                      <div className="action-box" id="transition-action-box">
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>⚖️ Human Review Action Panel</h3>
                        
                        {userRole !== 'General Counsel' ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--glass-border)' }}>
                            🔒 Review commands restricted. Switch role to <strong>General Counsel</strong> in the header to approve or reject this matter.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="form-group">
                              <label className="form-label" htmlFor="transition-notes-input">Decision Justification / Review Notes</label>
                              <textarea
                                id="transition-notes-input"
                                className="form-textarea"
                                rows={2}
                                placeholder="Enter reason, policy compliance rationale or mitigation commitments..."
                                value={transitionNotes}
                                onChange={(e) => setTransitionNotes(e.target.value)}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                className="btn btn-primary"
                                onClick={() => handleTransitionStatus('approved')}
                                disabled={isTransitioning}
                                style={{ background: 'var(--color-success)', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)' }}
                                id="btn-gc-approve"
                              >
                                {isTransitioning ? 'Processing...' : 'Approve & Release'}
                              </button>
                              <button
                                className="btn btn-secondary btn-danger"
                                onClick={() => handleTransitionStatus('rejected')}
                                disabled={isTransitioning}
                                id="btn-gc-reject"
                              >
                                {isTransitioning ? 'Processing...' : 'Reject / Flag Blocked'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem' }}>
                        🏁 This matter has been finalized as <strong>{selectedMatter.status.toUpperCase()}</strong>. The audit trail is locked.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    Running playbook evaluation rules...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '60px 0', textAlign: 'center' }} id="no-matter-selected">
              <span>⚖️</span>
              <p style={{ marginTop: '12px' }}>No matter selected.</p>
              <p style={{ fontSize: '0.8rem' }}>Select an intake matter from the queue on the left to run policies check, generate action plans, and log reviews.</p>
            </div>
          )}
        </section>
      </div>

      {/* Intake Wizard Modal */}
      {isWizardOpen && (
        <div className="modal-overlay" id="wizard-modal">
          <div className="glass-panel modal-content">
            <button className="modal-close" onClick={() => setIsWizardOpen(false)}>×</button>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Self-Serve Intake Wizard</h2>
            
            <div className="wizard-grid">
              {/* Form Section */}
              <div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="wizard-matter-name">Intake Matter Name</label>
                    <input
                      id="wizard-matter-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Stripe DPA, Acme Co MSA"
                      value={wizardName}
                      onChange={(e) => setWizardName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="wizard-matter-id">Matter ID</label>
                    <input
                      id="wizard-matter-id"
                      type="text"
                      className="form-input"
                      value={wizardId}
                      onChange={(e) => setWizardId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="wizard-schema-type">Select Intake Workflow Schema</label>
                  <select
                    id="wizard-schema-type"
                    className="form-select"
                    value={wizardSchema}
                    onChange={(e) => handleSchemaChange(e.target.value)}
                  >
                    <option value="SaaSContractIntake">SaaS Contract Intake (MSA/Order Form)</option>
                    <option value="DPATriage">DPA Triage (GDPR / Privacy)</option>
                    <option value="AIVendorReview">AI Vendor Review (Governance/IP)</option>
                    <option value="OpenSourceReview">Open-Source Review (Permissive/Copyleft)</option>
                    <option value="CustomerCommitment">Customer Commitment (SLA/Guarantees)</option>
                    <option value="ProductLaunchIntake">Product Launch Intake (Compliance Audit)</option>
                  </select>
                </div>

                <hr style={{ border: '0', borderTop: '1px solid var(--glass-border)', margin: '20px 0' }} />

                {/* Schema-specific Dynamic Fields */}
                <div id="dynamic-form-fields">
                  {wizardSchema === 'SaaSContractIntake' && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label" htmlFor="field-customer">Customer Name</label>
                          <input
                            id="field-customer"
                            type="text"
                            className="form-input"
                            value={wizardData.customer || ''}
                            onChange={(e) => handleWizardFieldChange('customer', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="field-owner">Request Owner</label>
                          <input
                            id="field-owner"
                            type="text"
                            className="form-input"
                            value={wizardData.requestOwner || ''}
                            onChange={(e) => handleWizardFieldChange('requestOwner', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label" htmlFor="field-contractType">Contract Type</label>
                          <select
                            id="field-contractType"
                            className="form-select"
                            value={wizardData.contractType || 'MSA'}
                            onChange={(e) => handleWizardFieldChange('contractType', e.target.value)}
                          >
                            <option value="MSA">MSA</option>
                            <option value="DPA">DPA</option>
                            <option value="SLA">SLA</option>
                            <option value="Addendum">Addendum</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="field-sector">Customer Sector (DORA Trigger)</label>
                          <select
                            id="field-sector"
                            className="form-select"
                            value={wizardData.customerSector || 'technology'}
                            onChange={(e) => handleWizardFieldChange('customerSector', e.target.value)}
                          >
                            <option value="technology">Technology</option>
                            <option value="financial">Financial / Banking (DORA)</option>
                            <option value="fintech">Fintech (DORA)</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="custom_dora_test">Custom DORA Test</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="checkbox-group">
                        <input
                          id="field-regulated"
                          type="checkbox"
                          checked={wizardData.regulatedCustomer || false}
                          onChange={(e) => handleWizardFieldChange('regulatedCustomer', e.target.checked)}
                        />
                        <label htmlFor="field-regulated">Regulated Customer (Triggers Risk Score Increase)</label>
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        <span className="form-label">Data Categories Involved</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                          {['emails', 'passwords', 'health_records', 'payment_details'].map((cat) => (
                            <label className="checkbox-group" key={cat} htmlFor={`cat-${cat}`}>
                              <input
                                id={`cat-${cat}`}
                                type="checkbox"
                                checked={wizardData.dataCategories?.includes(cat) || false}
                                onChange={() => handleWizardArrayToggle('dataCategories', cat)}
                              />
                              {cat.replace('_', ' ')}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        <span className="form-label">AI Features Involved</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                          {['generation', 'summarization', 'classification', 'unverified_training'].map((feat) => (
                            <label className="checkbox-group" key={feat} htmlFor={`feat-${feat}`}>
                              <input
                                id={`feat-${feat}`}
                                type="checkbox"
                                checked={wizardData.aiFeaturesInvolved?.includes(feat) || false}
                                onChange={() => handleWizardArrayToggle('aiFeaturesInvolved', feat)}
                              />
                              {feat.replace('_', ' ')}
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {wizardSchema === 'DPATriage' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="dpa-vendor">Vendor Name</label>
                        <input
                          id="dpa-vendor"
                          type="text"
                          className="form-input"
                          value={wizardData.vendor || ''}
                          onChange={(e) => handleWizardFieldChange('vendor', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="dpa-purpose">Data Processing Purpose</label>
                        <input
                          id="dpa-purpose"
                          type="text"
                          className="form-input"
                          value={wizardData.purpose || ''}
                          onChange={(e) => handleWizardFieldChange('purpose', e.target.value)}
                        />
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="dpa-cross"
                          type="checkbox"
                          checked={wizardData.crossBorderTransfer || false}
                          onChange={(e) => handleWizardFieldChange('crossBorderTransfer', e.target.checked)}
                        />
                        <label htmlFor="dpa-cross">Involves Cross-Border Data Transfer (GDPR/EU-US)</label>
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="dpa-sub"
                          type="checkbox"
                          checked={wizardData.subprocessorsInvolved || false}
                          onChange={(e) => handleWizardFieldChange('subprocessorsInvolved', e.target.checked)}
                        />
                        <label htmlFor="dpa-sub">Uses Subprocessors (Triggers Playbook Clause Checks)</label>
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="dpa-signoff"
                          type="checkbox"
                          checked={wizardData.dpoSignoffRequired || false}
                          onChange={(e) => handleWizardFieldChange('dpoSignoffRequired', e.target.checked)}
                        />
                        <label htmlFor="dpa-signoff">Explicit DPO Signoff Requested</label>
                      </div>
                    </>
                  )}

                  {wizardSchema === 'AIVendorReview' && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label" htmlFor="ai-vendor">AI Vendor</label>
                          <input
                            id="ai-vendor"
                            type="text"
                            className="form-input"
                            value={wizardData.vendor || ''}
                            onChange={(e) => handleWizardFieldChange('vendor', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="ai-tool">AI Tool/Model Name</label>
                          <input
                            id="ai-tool"
                            type="text"
                            className="form-input"
                            value={wizardData.tool || ''}
                            onChange={(e) => handleWizardFieldChange('tool', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="ai-dataUsage">Vendor Data Usage Model</label>
                        <select
                          id="ai-dataUsage"
                          className="form-select"
                          value={wizardData.dataUsageModel || 'inference_only'}
                          onChange={(e) => handleWizardFieldChange('dataUsageModel', e.target.value)}
                        >
                          <option value="inference_only">Inference Only (Private API)</option>
                          <option value="training">Vendor Retains Data for Model Training</option>
                        </select>
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="ai-optout"
                          type="checkbox"
                          checked={wizardData.trainingOptOut || false}
                          onChange={(e) => handleWizardFieldChange('trainingOptOut', e.target.checked)}
                        />
                        <label htmlFor="ai-optout">Model Training Opt-out Verified</label>
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="ai-indemnity"
                          type="checkbox"
                          checked={wizardData.copyrightIndemnity || false}
                          onChange={(e) => handleWizardFieldChange('copyrightIndemnity', e.target.checked)}
                        />
                        <label htmlFor="ai-indemnity">Full Copyright/IP Indemnity Included</label>
                      </div>
                    </>
                  )}

                  {wizardSchema === 'OpenSourceReview' && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label" htmlFor="oss-dep">Dependency Name</label>
                          <input
                            id="oss-dep"
                            type="text"
                            className="form-input"
                            value={wizardData.dependencyName || ''}
                            onChange={(e) => handleWizardFieldChange('dependencyName', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="oss-licence">Licence</label>
                          <select
                            id="oss-licence"
                            className="form-select"
                            value={wizardData.licence || 'MIT'}
                            onChange={(e) => handleWizardFieldChange('licence', e.target.value)}
                          >
                            <option value="MIT">MIT (Permissive)</option>
                            <option value="Apache-2.0">Apache 2.0 (Permissive)</option>
                            <option value="LGPL-2.1">LGPL 2.1 (Weak Copyleft)</option>
                            <option value="GPL-3.0">GPL 3.0 (Strong Copyleft)</option>
                            <option value="AGPL-3.0">AGPL 3.0 (Network Copyleft)</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="oss-dist">Distribution Model</label>
                        <select
                          id="oss-dist"
                          className="form-select"
                          value={wizardData.distributionModel || 'SaaS'}
                          onChange={(e) => handleWizardFieldChange('distributionModel', e.target.value)}
                        >
                          <option value="SaaS">SaaS Cloud Only</option>
                          <option value="OnPrem">On-Premises Software</option>
                          <option value="MobileApp">Mobile App Store Package</option>
                        </select>
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="oss-mod"
                          type="checkbox"
                          checked={wizardData.modificationPlanned || false}
                          onChange={(e) => handleWizardFieldChange('modificationPlanned', e.target.checked)}
                        />
                        <label htmlFor="oss-mod">Modifications Planned to Dependency Code</label>
                      </div>
                    </>
                  )}

                  {wizardSchema === 'CustomerCommitment' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="com-customer">Customer</label>
                        <input
                          id="com-customer"
                          type="text"
                          className="form-input"
                          value={wizardData.customer || ''}
                          onChange={(e) => handleWizardFieldChange('customer', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="com-commitment">Custom Commitment Description</label>
                        <input
                          id="com-commitment"
                          type="text"
                          className="form-input"
                          value={wizardData.commitment || ''}
                          onChange={(e) => handleWizardFieldChange('commitment', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label" htmlFor="com-sla">SLA Uptime Guarantee (%)</label>
                          <input
                            id="com-sla"
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={wizardData.slaUptimeGuarantees || 99.9}
                            onChange={(e) => handleWizardFieldChange('slaUptimeGuarantees', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
                          <label className="checkbox-group" htmlFor="com-damage" style={{ marginTop: '24px' }}>
                            <input
                              id="com-damage"
                              type="checkbox"
                              checked={wizardData.liquidatedDamagesApplies || false}
                              onChange={(e) => handleWizardFieldChange('liquidatedDamagesApplies', e.target.checked)}
                            />
                            Liquidated Damages Applies
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {wizardSchema === 'ProductLaunchIntake' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="launch-name">Feature/Launch Name</label>
                        <input
                          id="launch-name"
                          type="text"
                          className="form-input"
                          value={wizardData.featureName || ''}
                          onChange={(e) => handleWizardFieldChange('featureName', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="launch-desc">Feature Description</label>
                        <textarea
                          id="launch-desc"
                          className="form-textarea"
                          rows={2}
                          value={wizardData.description || ''}
                          onChange={(e) => handleWizardFieldChange('description', e.target.value)}
                        />
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="launch-ai"
                          type="checkbox"
                          checked={wizardData.involvesAI || false}
                          onChange={(e) => handleWizardFieldChange('involvesAI', e.target.checked)}
                        />
                        <label htmlFor="launch-ai">Involves Generative AI or LLMs</label>
                      </div>
                      <div className="checkbox-group">
                        <input
                          id="launch-high"
                          type="checkbox"
                          checked={wizardData.highRiskAITriage || false}
                          onChange={(e) => handleWizardFieldChange('highRiskAITriage', e.target.checked)}
                        />
                        <label htmlFor="launch-high">High Risk AI triage (e.g. automated decisions on humans)</label>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={handleSaveWizard} id="wizard-submit-btn">
                    Submit Intake & Save
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsWizardOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>

              {/* Sidebar Live Triage Feedback */}
              <div className="triage-panel" id="wizard-live-triage">
                <span className="triage-header">⚡ Live Triage Analytics</span>
                
                {wizardAnalysis ? (
                  <>
                    <div className="triage-message-box">
                      <div className="triage-title">
                        <span>Risk Level:</span>
                        {renderRiskPill(wizardAnalysis.risk?.level || 'low')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Gate: <strong>{wizardAnalysis.actionPlan?.reviewGate}</strong>
                      </div>
                    </div>

                    <div className="triage-reasons">
                      <strong>Validation Check:</strong>
                      {wizardAnalysis.validation?.valid ? (
                        <span style={{ color: 'var(--color-success)', fontSize: '0.8rem' }}>✅ Schema matches constraints</span>
                      ) : (
                        <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>❌ Validation Errors ({wizardAnalysis.validation?.errors.length})</span>
                      )}
                    </div>

                    {wizardAnalysis.risk?.reasons && wizardAnalysis.risk.reasons.length > 0 && (
                      <div className="triage-reasons">
                        <strong>Triggers Triggered:</strong>
                        {wizardAnalysis.risk.reasons.map((r, idx) => (
                          <div className="triage-reason-item" key={idx}>
                            <span>•</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Type inputs to see real-time compliance validation and risk scoring.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
