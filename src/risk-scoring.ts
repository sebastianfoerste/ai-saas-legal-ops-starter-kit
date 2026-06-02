import * as fs from 'fs';
import * as path from 'path';

export type RiskLevel = 'low' | 'medium' | 'high' | 'escalate';

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

export interface RiskRule {
  id: string;
  name: string;
  schemaTypes: string[]; // '*' for global, or specific schema types normalized
  evaluate: (data: any, typeKey: string, raiseTo: (level: RiskLevel, reason: string) => void) => void;
}

export const registeredRules: RiskRule[] = [
  {
    id: 'rule.regulated_customer',
    name: 'Regulated Customers Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.regulatedCustomer === true) {
        raiseTo('escalate', 'Involves a regulated customer (regulatedCustomer: true)');
      }
      if (data.customerSector && ['finance', 'banking', 'healthcare', 'fintech', 'insurance'].includes(data.customerSector.toLowerCase())) {
        raiseTo('high', `Customer operates in sensitive sector: ${data.customerSector}`);
      }
      if (data.customerSegment && data.customerSegment.toLowerCase().includes('regulated')) {
        raiseTo('escalate', 'Product launch targets regulated customer segments');
      }
    }
  },
  {
    id: 'rule.sensitive_data',
    name: 'Sensitive or High-Risk Data Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.specialCategoryData && Array.isArray(data.specialCategoryData) && data.specialCategoryData.length > 0) {
        raiseTo('escalate', `Contains GDPR Art. 9 Special Category Data: ${data.specialCategoryData.join(', ')}`);
      }
      const sensitiveKeywords = ['health', 'biometric', 'payment', 'card', 'ssn', 'credential', 'secret', 'medical', 'patient', 'social security'];
      if (data.dataCategories && Array.isArray(data.dataCategories)) {
        const foundSensitive = data.dataCategories.filter((cat: string) => 
          sensitiveKeywords.some((keyword: string) => cat.toLowerCase().includes(keyword))
        );
        if (foundSensitive.length > 0) {
          raiseTo('escalate', `Contains sensitive or high-risk data categories: ${foundSensitive.join(', ')}`);
        }
      }
      if (data.dataInvolved && Array.isArray(data.dataInvolved)) {
        const foundSensitiveInvolved = data.dataInvolved.filter((cat: string) => 
          sensitiveKeywords.some((keyword: string) => cat.toLowerCase().includes(keyword))
        );
        if (foundSensitiveInvolved.length > 0) {
          raiseTo('escalate', `Product launch involves sensitive data categories: ${foundSensitiveInvolved.join(', ')}`);
        }
      }
    }
  },
  {
    id: 'rule.retention_terms',
    name: 'Non-Standard Retention Terms Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.retentionPosition && typeof data.retentionPosition === 'string') {
        const pos = data.retentionPosition.toLowerCase();
        if (pos.includes('indefinite') || pos.includes('forever') || pos.includes('unlimited') || pos.includes('retained permanently')) {
          raiseTo('escalate', `Non-standard retention position: ${data.retentionPosition}`);
        }
      }
      if (data.retentionPeriod && typeof data.retentionPeriod === 'string') {
        const period = data.retentionPeriod.toLowerCase();
        if (period.includes('indefinite') || period.includes('forever') || period.includes('90 days') || period.includes('unlimited')) {
          raiseTo('escalate', `Non-standard retention period: ${data.retentionPeriod}`);
        }
      }
      if (data.deletionProcess && typeof data.deletionProcess === 'string') {
        const del = data.deletionProcess.toLowerCase();
        if (del.includes('90 days') || del.includes('manual') || del.includes('negotiated')) {
          raiseTo('high', `Non-standard deletion SLA: ${data.deletionProcess}`);
        }
      }
    }
  },
  {
    id: 'rule.customer_data_ai',
    name: 'Use of Customer Data with AI Tools Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.trainingOnCustomerData === true) {
        raiseTo('escalate', 'AI Vendor trains base models on customer data inputs');
      }
      if (data.aiFeaturesInvolved && Array.isArray(data.aiFeaturesInvolved) && data.aiFeaturesInvolved.length > 0) {
        raiseTo('medium', `AI features integrated: ${data.aiFeaturesInvolved.join(', ')}`);
      }
      if (data.aiFeatures && Array.isArray(data.aiFeatures)) {
        const fineTune = data.aiFeatures.some((f: string) => {
          const val = f.toLowerCase();
          return val.includes('fine-tun') || val.includes('finetun') || val.includes('training') || val.includes('train ');
        });
        if (fineTune) {
          raiseTo('escalate', `AI launch involves customer data training / model fine-tuning: ${data.aiFeatures.join(', ')}`);
        }
      }
    }
  },
  {
    id: 'rule.unclear_subprocessors',
    name: 'Unclear Subprocessors Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.subprocessors && Array.isArray(data.subprocessors)) {
        if (data.subprocessors.length === 0) {
          raiseTo('high', 'No subprocessors declared');
        }
        const hasUnclear = data.subprocessors.some((sub: any) => {
          const name = typeof sub === 'string' ? sub.toLowerCase() : sub.name?.toLowerCase() || '';
          const loc = typeof sub === 'string' ? '' : sub.location?.toLowerCase() || '';
          return name.includes('unverified') || name.includes('unknown') || loc.includes('non-eu') || loc.includes('high-risk');
        });
        if (hasUnclear) {
          raiseTo('escalate', 'Involves unclear or high-risk subprocessors/hosting regions');
        }
      }
    }
  },
  {
    id: 'rule.open_source_licenses',
    name: 'Open-Source Licensing Uncertainty Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (typeKey.includes('opensource') || typeKey.includes('license')) {
        const licence = (data.licence || data.license || '').toUpperCase();
        const copyleftLicenses = ['GPL', 'AGPL', 'SSPL', 'OSL', 'CC-BY-NC'];
        const matchesCopyleft = copyleftLicenses.some(lic => licence.includes(lic));
        
        if (matchesCopyleft && data.copyleftConcern === true) {
          raiseTo('escalate', `Copyleft concern triggered for package under license: ${licence}`);
        } else if (matchesCopyleft) {
          raiseTo('high', `Reciprocal copyleft license detected: ${licence}`);
        }

        // Expanded EPL/MPL/EUPL copyleft support
        const weakCopyleftLicenses = ['EPL', 'MPL', 'EUPL'];
        const matchesWeakCopyleft = weakCopyleftLicenses.some(lic => licence.includes(lic));
        if (matchesWeakCopyleft) {
          if (data.copyleftConcern === true) {
            raiseTo('escalate', `EPL/MPL/EUPL reciprocity concern triggered: ${licence}`);
          } else {
            raiseTo('medium', `Weak copyleft reciprocal license detected: ${licence}`);
          }
        }
        
        if (data.approvalStatus === 'Escalated' || data.approvalStatus === 'Rejected') {
          raiseTo('escalate', `Open-source approval status is ${data.approvalStatus}`);
        }
      }
    }
  },
  {
    id: 'rule.public_claims',
    name: 'Public Product Claims Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.publicClaims && Array.isArray(data.publicClaims) && data.publicClaims.length > 0) {
        const riskClaims = ['99', '100', 'zero', 'guarantee', 'hallucination-free', 'never', 'error-free', 'accurate'];
        const matchedClaims = data.publicClaims.filter((claim: string) => 
          riskClaims.some(keyword => claim.toLowerCase().includes(keyword))
        );
        if (matchedClaims.length > 0) {
          raiseTo('escalate', `Launch includes unvetted, high-risk public claims: ${matchedClaims.join('; ')}`);
        } else {
          raiseTo('high', 'Launch contains public product capability/accuracy claims');
        }
      }
    }
  },
  {
    id: 'rule.customer_commitments',
    name: 'Material Customer Commitments Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.currentStatus && ['at_risk', 'overdue'].includes(data.currentStatus.toLowerCase())) {
        raiseTo('escalate', `Material customer commitment status is: ${data.currentStatus}`);
      }
      if (data.renewalRelevance === true && data.currentStatus === 'pending') {
        raiseTo('high', 'Pending customer commitment is relevant for upcoming contract renewal');
      }
    }
  },
  {
    id: 'rule.executive_risk',
    name: 'Board-level / Executive-level Risk Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.redFlags && Array.isArray(data.redFlags) && data.redFlags.length > 0) {
        const boardKeywords = ['board', 'executive', 'lawsuit', 'breach', 'fine', 'liability', 'sec', 'class action'];
        const matchedFlags = data.redFlags.filter((flag: string) => 
          boardKeywords.some(keyword => flag.toLowerCase().includes(keyword))
        );
        if (matchedFlags.length > 0) {
          raiseTo('escalate', `Board-level red flag(s) identified: ${matchedFlags.join(', ')}`);
        } else {
          raiseTo('high', `Contract intake contains active red flags: ${data.redFlags.join(', ')}`);
        }
      }
      
      if (data.regulatoryImpact && typeof data.regulatoryImpact === 'string') {
        const reg = data.regulatoryImpact.toLowerCase();
        if (reg.includes('high-risk') || reg.includes('bafin') || reg.includes('dora') || reg.includes('ai act') || reg.includes('audit')) {
          raiseTo('escalate', `Regulatory impact assessment triggers escalation: ${data.regulatoryImpact}`);
        }
      }
    }
  },
  {
    id: 'rule.dora_exit_strategy',
    name: 'DORA ICT Exit Feasibility Rule',
    schemaTypes: ['*'],
    evaluate: (data, typeKey, raiseTo) => {
      const isFintechSector = data.customerSector && ['finance', 'banking', 'fintech', 'insurance'].includes(data.customerSector.toLowerCase());
      const mentionsDora = (data.customerSegment && data.customerSegment.toLowerCase().includes('dora')) || 
                           (data.regulatoryImpact && data.regulatoryImpact.toLowerCase().includes('dora')) ||
                           (data.commitment && data.commitment.toLowerCase().includes('dora')) ||
                           (data.customerSector && data.customerSector.toLowerCase().includes('dora'));
      if (isFintechSector || mentionsDora) {
        if (data.exitStrategy === undefined || data.exitStrategy === null || data.exitStrategy === '') {
          raiseTo('high', 'Regulated customer sector lacks a documented exit strategy under DORA rules');
        } else if (typeof data.exitStrategy === 'string' && ['pending', 'incomplete', 'under development'].includes(data.exitStrategy.toLowerCase())) {
          raiseTo('medium', `DORA exit strategy is incomplete or pending: ${data.exitStrategy}`);
        }
      }
    }
  },
  {
    id: 'rule.copyright_safety',
    name: 'Copyright Safety & Indemnity Rule',
    schemaTypes: ['aivendorreview'],
    evaluate: (data, typeKey, raiseTo) => {
      if (data.copyrightIndemnity === false) {
        raiseTo('high', 'AI Vendor does not provide copyright infringement indemnity for outputs');
      }
      if (data.trainingFilterSources && Array.isArray(data.trainingFilterSources)) {
        if (data.trainingFilterSources.length === 0 || data.trainingFilterSources.some((src: string) => ['unvetted', 'none', 'raw', 'none declared'].includes(src.toLowerCase()))) {
          raiseTo('medium', 'AI Vendor fails to document robust training dataset filtering to prevent copyright infringement');
        }
      }
    }
  }
];

interface Condition {
  field: string;
  operator: 'equals' | 'contains' | 'true' | 'false' | 'empty' | 'not_empty';
  value?: any;
}

interface CustomJsonRule {
  id: string;
  name: string;
  schemaTypes: string[];
  level: RiskLevel;
  conditions: Condition[];
  message: string;
}

function evaluateCondition(data: any, cond: Condition): boolean {
  const val = data[cond.field];
  switch (cond.operator) {
    case 'equals':
      return String(val).toLowerCase() === String(cond.value).toLowerCase();
    case 'contains':
      if (typeof val === 'string') {
        return val.toLowerCase().includes(String(cond.value).toLowerCase());
      }
      if (Array.isArray(val)) {
        return val.some(item => String(item).toLowerCase().includes(String(cond.value).toLowerCase()));
      }
      return false;
    case 'true':
      return val === true;
    case 'false':
      return val === false;
    case 'empty':
      return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    case 'not_empty':
      return val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0);
    default:
      return false;
  }
}

export function loadConfigRules(): RiskRule[] {
  const configPath = path.resolve(process.cwd(), 'policies', 'rules.json');
  if (!fs.existsSync(configPath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const json = JSON.parse(raw) as CustomJsonRule[];
    return json.map(rule => ({
      id: rule.id,
      name: rule.name,
      schemaTypes: rule.schemaTypes,
      evaluate: (data, typeKey, raiseTo) => {
        const matchesAll = rule.conditions.every(cond => evaluateCondition(data, cond));
        if (matchesAll) {
          raiseTo(rule.level, rule.message);
        }
      }
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Deterministically analyzes a legal intake or matter payload and returns a risk score.
 * Rules are entirely rules-based, deterministic, and run locally without LLM APIs.
 * 
 * @param schemaType The schema title or document type (e.g. 'SaaSContractIntake', 'DPATriage', 'AIVendorReview', 'OpenSourceReview', 'CustomerCommitment', 'ProductLaunchIntake')
 * @param data The JSON data payload validated against the respective schema.
 */
export function calculateRisk(schemaType: string, data: any): RiskAssessment {
  const reasons: string[] = [];
  let currentMaxLevel: RiskLevel = 'low';

  const raiseTo = (level: RiskLevel, reason: string) => {
    reasons.push(reason);
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'escalate'];
    if (levels.indexOf(level) > levels.indexOf(currentMaxLevel)) {
      currentMaxLevel = level;
    }
  };

  const typeKey = schemaType.toLowerCase().replace(/[^a-z]/g, '');

  // Load custom dynamic rules from policy file
  const configRules = loadConfigRules();
  const allRules = [...registeredRules, ...configRules];

  // Run all registered rules
  for (const rule of allRules) {
    if (rule.schemaTypes.includes('*') || rule.schemaTypes.map(s => s.toLowerCase().replace(/[^a-z]/g, '')).includes(typeKey)) {
      rule.evaluate(data, typeKey, raiseTo);
    }
  }

  // General Defaults if not matched above
  if (data.nonStandardTerms && Array.isArray(data.nonStandardTerms) && data.nonStandardTerms.length > 0) {
    if (currentMaxLevel === 'low') {
      raiseTo('medium', 'Contains non-standard contractual terms');
    }
  }

  return {
    level: currentMaxLevel,
    reasons: reasons.length > 0 ? reasons : ['No escalation or high-risk rules matched.']
  };
}
