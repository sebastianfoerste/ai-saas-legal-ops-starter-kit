import { NextResponse } from 'next/server';
import { calculateRisk, getPolicyHealth } from '@core/risk-scoring';
import { validateJSON } from '@core/validate';
import { createLegalActionPlan } from '@core/action-plan';
import { createEvidencePack } from '@core/evidence-pack';
import { createContractPlaybookReview } from '@core/contract-playbook';
import { createRegulatoryObligationMatrix } from '@core/regulatory-matrix';
import { createDecisionPacket } from '@core/decision-packet';
import { isSchemaType, loadSchemaForType } from '@core/workflows';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schemaType, data } = body;

    if (!schemaType || !data) {
      return NextResponse.json({ error: 'Missing schemaType or data' }, { status: 400 });
    }

    if (!isSchemaType(schemaType)) {
      return NextResponse.json({ error: `Unsupported schema type: ${schemaType}` }, { status: 400 });
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'data must be a JSON object' }, { status: 400 });
    }

    const generatedAt = new Date().toISOString();
    const policyHealth = getPolicyHealth();
    const schema = loadSchemaForType(schemaType);
    const validation = validateJSON(schema, data);
    const risk = calculateRisk(schemaType, data);
    const actionPlan = createLegalActionPlan(schemaType, data, { risk });
    const evidencePack = createEvidencePack(schemaType, data, { actionPlan, generatedAt, risk });
    const regulatoryMatrix = createRegulatoryObligationMatrix(schemaType, data, { actionPlan, generatedAt, risk });
    const contractPlaybook = schemaType === 'SaaSContractIntake'
      ? createContractPlaybookReview(data, { actionPlan, generatedAt, risk })
      : undefined;
    const decisionPacket = createDecisionPacket({
      schemaType,
      data,
      validation,
      risk,
      actionPlan,
      evidencePack,
      regulatoryMatrix,
      contractPlaybook,
      generatedAt
    });

    return NextResponse.json({
      validation,
      risk,
      actionPlan,
      evidencePack,
      regulatoryMatrix,
      contractPlaybook,
      policyHealth,
      decisionPacket
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message, policyHealth: getPolicyHealth() }, { status: 500 });
  }
}
