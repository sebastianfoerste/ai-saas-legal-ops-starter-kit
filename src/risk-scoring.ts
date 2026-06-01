export type RiskLevel = 'low' | 'medium' | 'high' | 'escalate';

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
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

  const type = schemaType.toLowerCase().replace(/[^a-z]/g, '');

  // 1. Regulated Customers Rule
  if (data.regulatedCustomer === true) {
    raiseTo('escalate', 'Involves a regulated customer (regulatedCustomer: true)');
  }
  if (data.customerSector && ['finance', 'banking', 'healthcare', 'fintech', 'insurance'].includes(data.customerSector.toLowerCase())) {
    raiseTo('high', `Customer operates in sensitive sector: ${data.customerSector}`);
  }
  if (data.customerSegment && data.customerSegment.toLowerCase().includes('regulated')) {
    raiseTo('escalate', 'Product launch targets regulated customer segments');
  }

  // 2. Sensitive or High-Risk Data Rule
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

  // 3. Non-Standard Retention Terms Rule
  if (data.retentionPosition && typeof data.retentionPosition === 'string') {
    const pos = data.retentionPosition.toLowerCase();
    if (pos.includes('indefinite') || pos.includes('forever') || pos.includes('unlimited') || pos.includes('retined permanently')) {
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

  // 4. Use of Customer Data with AI Tools Rule
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

  // 5. Unclear Subprocessors Rule
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

  // 6. Open-Source Licensing Uncertainty Rule
  if (type.includes('opensource') || type.includes('license')) {
    const licence = (data.licence || data.license || '').toUpperCase();
    const copyleftLicenses = ['GPL', 'AGPL', 'SSPL', 'OSL', 'CC-BY-NC'];
    const matchesCopyleft = copyleftLicenses.some(lic => licence.includes(lic));
    
    if (matchesCopyleft && data.copyleftConcern === true) {
      raiseTo('escalate', `Copyleft concern triggered for package under license: ${licence}`);
    } else if (matchesCopyleft) {
      raiseTo('high', `Reciprocal copyleft license detected: ${licence}`);
    }
    
    if (data.approvalStatus === 'Escalated' || data.approvalStatus === 'Rejected') {
      raiseTo('escalate', `Open-source approval status is ${data.approvalStatus}`);
    }
  }

  // 7. Public Product Claims Rule
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

  // 8. Material Customer Commitments Rule
  if (data.currentStatus && ['at_risk', 'overdue'].includes(data.currentStatus.toLowerCase())) {
    raiseTo('escalate', `Material customer commitment status is: ${data.currentStatus}`);
  }
  if (data.renewalRelevance === true && data.currentStatus === 'pending') {
    raiseTo('high', 'Pending customer commitment is relevant for upcoming contract renewal');
  }

  // 9. Board-level / Executive-level Risk Rule
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
