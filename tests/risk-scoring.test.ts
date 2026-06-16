import { describe, test, expect } from 'vitest';
import { calculateRisk } from '../src/risk-scoring.js';

describe('Deterministic Risk-Scoring Engine Tests', () => {
  
  test('should return low risk for standard SaaS intake', () => {
    const data = {
      requestOwner: "Bob",
      customer: "Standard LLC",
      contractType: "MSA",
      dealStage: "Proposal",
      regulatedCustomer: false,
      dataCategories: ["user names", "business emails"],
      aiFeaturesInvolved: []
    };
    const result = calculateRisk('SaaSContractIntake', data);
    expect(result.level).toBe('low');
  });

  test('should escalate when customer is regulated', () => {
    const data = {
      customer: "Bank of Zurich",
      regulatedCustomer: true,
      dataCategories: ["usernames"],
      aiFeaturesInvolved: []
    };
    const result = calculateRisk('SaaSContractIntake', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons).toContain('Involves a regulated customer (regulatedCustomer: true)');
  });

  test('should escalate when data categories include health/biometrics', () => {
    const data = {
      customer: "MedClinic",
      regulatedCustomer: false,
      dataCategories: ["patient health metrics", "emails"],
      aiFeaturesInvolved: []
    };
    const result = calculateRisk('SaaSContractIntake', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.includes('sensitive or high-risk data categories'))).toBe(true);
  });

  test('should escalate when special category data is processed in DPA', () => {
    const data = {
      productOrService: "Identity Verifier",
      role: "processor",
      dataSubjects: ["employees"],
      personalDataCategories: ["face maps"],
      specialCategoryData: ["biometric fingerprint profiles"],
      transferLocations: ["EU"],
      retentionPeriod: "Term + 30 days",
      deletionProcess: "Certified deletion",
      securityAnnexStatus: "Standard TOMs"
    };
    const result = calculateRisk('DPATriage', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.includes('Special Category Data'))).toBe(true);
  });

  test('should escalate on non-standard retention (indefinite)', () => {
    const data = {
      vendor: "TranslateCorp",
      tool: "Translator API",
      useCase: "Localization",
      businessOwner: "John",
      dataEntered: ["contracts"],
      retentionPosition: "Indefinite storage of inputs",
      trainingOnCustomerData: false,
      approvedUse: true
    };
    const result = calculateRisk('AIVendorReview', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.includes('Non-standard retention position'))).toBe(true);
  });

  test('should escalate when AI vendor trains on customer data', () => {
    const data = {
      vendor: "FastAI",
      tool: "Summary Bot",
      useCase: "Meeting notes",
      businessOwner: "Sarah",
      dataEntered: ["chats"],
      retentionPosition: "30 days",
      trainingOnCustomerData: true,
      approvedUse: true
    };
    const result = calculateRisk('AIVendorReview', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons).toContain('AI Vendor trains base models on customer data inputs');
  });

  test('should escalate when product launch involves model training on customer data', () => {
    const data = {
      feature: "Smart Suggest",
      owner: "Dave",
      targetDate: "2026-08-01",
      customerSegment: "Enterprise",
      jurisdictions: ["US"],
      dataInvolved: ["clicks"],
      aiFeatures: ["Local model fine-tuning on customer transcripts"],
      publicClaims: [],
      privacyImpact: "DPIA completed",
      contractImpact: "None",
      regulatoryImpact: "None"
    };
    const result = calculateRisk('ProductLaunchIntake', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.includes('fine-tuning'))).toBe(true);
  });

  test('should escalate when subprocessor is unverified or in non-EU country', () => {
    const data = {
      productOrService: "Search",
      role: "processor",
      dataSubjects: ["users"],
      personalDataCategories: ["IPs"],
      specialCategoryData: [],
      subprocessors: [
        { name: "Unverified Host", location: "non-EU region" }
      ],
      transferLocations: ["US"],
      retentionPeriod: "30 days",
      deletionProcess: "Standard deletion",
      securityAnnexStatus: "Standard TOMs"
    };
    const result = calculateRisk('DPATriage', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons).toContain('Involves unclear or high-risk subprocessors/hosting regions');
  });

  test('should escalate high-risk DPA when subprocessors are missing', () => {
    const result = calculateRisk('DPATriage', {
      productOrService: 'AI workspace',
      role: 'processor',
      dataSubjects: ['customer employees'],
      personalDataCategories: ['workspace documents'],
      specialCategoryData: [],
      subprocessors: [],
      transferLocations: ['EU'],
      retentionPeriod: '30 days',
      deletionProcess: 'Standard deletion',
      securityAnnexStatus: 'Standard TOMs'
    });

    expect(result.level).toBe('high');
    expect(result.reasons).toContain('No subprocessors declared');
  });

  test('should escalate GPL/AGPL dependency when copyleft concern is true', () => {
    const data = {
      package: "agpl-helper",
      licence: "AGPL-3.0",
      useCase: "linking",
      distributionModel: "Client-Side SDK",
      modifiedOrUnmodified: "modified",
      linkedOrSeparateService: "linked",
      attributionNeeded: true,
      copyleftConcern: true,
      approvalStatus: "Escalated"
    };
    const result = calculateRisk('OpenSourceReview', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.includes('Copyleft concern triggered'))).toBe(true);
  });

  test('should escalate product launch with high-risk public claims', () => {
    const data = {
      feature: "AutoAudit",
      owner: "Kate",
      targetDate: "2026-09-01",
      customerSegment: "SMB",
      jurisdictions: ["US"],
      dataInvolved: ["logs"],
      aiFeatures: ["API"],
      publicClaims: ["Produces zero hallucinations and is 100% accurate"],
      privacyImpact: "None",
      contractImpact: "None",
      regulatoryImpact: "None"
    };
    const result = calculateRisk('ProductLaunchIntake', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.includes('public claims'))).toBe(true);
  });

  test('should escalate customer commitments that are overdue or at_risk', () => {
    const data = {
      customer: "MegaCorp",
      commitment: "Frankfurt storage only",
      sourceDocument: "MSA",
      owner: "Alex",
      productArea: "infra",
      renewalRelevance: true,
      reviewDate: "2026-06-15",
      currentStatus: "at_risk"
    };
    const result = calculateRisk('CustomerCommitment', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons).toContain('Material customer commitment status is: at_risk');
  });

  test('should escalate contract intake with board-level or lawsuit red flags', () => {
    const data = {
      requestOwner: "Mark",
      customer: "Apex",
      contractType: "MSA",
      dealStage: "LegalReview",
      regulatedCustomer: false,
      dataCategories: ["emails"],
      aiFeaturesInvolved: [],
      redFlags: ["Customer demands indemnity for any SEC board investigations or regulatory fines"]
    };
    const result = calculateRisk('SaaSContractIntake', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.includes('Board-level red flag'))).toBe(true);
  });

  test('should escalate product launch with high-risk regulatory impact', () => {
    const data = {
      feature: "Credit Scorer",
      owner: "Sarah",
      targetDate: "2026-10-01",
      customerSegment: "Enterprise",
      jurisdictions: ["EU"],
      dataInvolved: ["salaries"],
      aiFeatures: ["AI classification"],
      publicClaims: [],
      privacyImpact: "High",
      contractImpact: "High",
      regulatoryImpact: "Classified as high-risk under the EU AI Act"
    };
    const result = calculateRisk('ProductLaunchIntake', data);
    expect(result.level).toBe('escalate');
    expect(result.reasons.some(r => r.toLowerCase().includes('regulatory impact'))).toBe(true);
  });

  test('should trigger high risk when fintech customer lacks DORA exit strategy', () => {
    const data = {
      customer: "Swiss Fintech",
      customerSector: "Finance",
      regulatedCustomer: false,
      dataCategories: ["user accounts"]
    };
    const result = calculateRisk('SaaSContractIntake', data);
    expect(result.level).toBe('high');
    expect(result.reasons.some(r => r.includes('lacks a documented exit strategy'))).toBe(true);
  });

  test('should trigger medium risk when fintech customer has pending DORA exit strategy', () => {
    const data = {
      customer: "Swiss Fintech",
      customerSector: "Software",
      customerSegment: "DORA Markets",
      regulatedCustomer: false,
      dataCategories: ["user accounts"],
      exitStrategy: "pending"
    };
    const result = calculateRisk('SaaSContractIntake', data);
    expect(result.level).toBe('medium');
    expect(result.reasons.some(r => r.includes('DORA exit strategy is incomplete'))).toBe(true);
  });

  test('should trigger high risk when AI vendor lacks copyright indemnity', () => {
    const data = {
      vendor: "Base LLM Inc",
      tool: "Base Generator",
      useCase: "drafting",
      businessOwner: "Bob",
      dataEntered: ["code"],
      retentionPosition: "30 days",
      trainingOnCustomerData: false,
      approvedUse: true,
      copyrightIndemnity: false
    };
    const result = calculateRisk('AIVendorReview', data);
    expect(result.level).toBe('high');
    expect(result.reasons.some(r => r.includes('does not provide copyright infringement indemnity'))).toBe(true);
  });

  test('should trigger medium risk when AI vendor training filters are unvetted', () => {
    const data = {
      vendor: "Base LLM Inc",
      tool: "Base Generator",
      useCase: "drafting",
      businessOwner: "Bob",
      dataEntered: ["code"],
      retentionPosition: "30 days",
      trainingOnCustomerData: false,
      approvedUse: true,
      copyrightIndemnity: true,
      trainingFilterSources: ["none"]
    };
    const result = calculateRisk('AIVendorReview', data);
    expect(result.level).toBe('medium');
    expect(result.reasons.some(r => r.includes('fails to document robust training dataset filtering'))).toBe(true);
  });

  test('should detect EPL/MPL/EUPL weak copyleft licenses', () => {
    const data = {
      package: "mpl-parser",
      licence: "MPL-2.0",
      useCase: "linking",
      distributionModel: "Client-Side SDK",
      modifiedOrUnmodified: "unmodified",
      linkedOrSeparateService: "separate",
      attributionNeeded: true,
      copyleftConcern: false
    };
    const result = calculateRisk('OpenSourceReview', data);
    expect(result.level).toBe('medium');
    expect(result.reasons.some(r => r.includes('Weak copyleft reciprocal license detected'))).toBe(true);
  });
});
