import { NextResponse } from 'next/server';
import { loadMatterWithDiagnostics, deleteMatter, validateMatterId } from '@core/storage';
import { calculateRisk, getPolicyHealth } from '@core/risk-scoring';
import { validateJSON } from '@core/validate';
import { createLegalActionPlan } from '@core/action-plan';
import { createEvidencePack } from '@core/evidence-pack';
import { createContractPlaybookReview } from '@core/contract-playbook';
import { createRegulatoryObligationMatrix } from '@core/regulatory-matrix';
import { createDecisionPacket } from '@core/decision-packet';
import { loadSchemaForType } from '@core/workflows';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { matter, diagnostic } = loadMatterWithDiagnostics(id);
    if (!matter) {
      return NextResponse.json({ error: diagnostic?.reason ?? `Matter with ID ${id} not found` }, { status: diagnostic ? 400 : 404 });
    }

    const generatedAt = new Date().toISOString();
    const schema = loadSchemaForType(matter.schemaType);
    const validation = validateJSON(schema, matter.data);
    const risk = calculateRisk(matter.schemaType, matter.data);
    const actionPlan = createLegalActionPlan(matter.schemaType, matter.data, { risk });
    const evidencePack = createEvidencePack(matter.schemaType, matter.data, { actionPlan, generatedAt, risk });
    const regulatoryMatrix = createRegulatoryObligationMatrix(matter.schemaType, matter.data, { actionPlan, generatedAt, risk });
    const contractPlaybook = matter.schemaType === 'SaaSContractIntake'
      ? createContractPlaybookReview(matter.data, { actionPlan, generatedAt, risk })
      : undefined;
    const decisionPacket = createDecisionPacket({
      matter,
      validation,
      risk,
      actionPlan,
      evidencePack,
      regulatoryMatrix,
      contractPlaybook,
      generatedAt
    });

    return NextResponse.json({
      matter,
      validation,
      risk,
      actionPlan,
      evidencePack,
      regulatoryMatrix,
      contractPlaybook,
      policyHealth: getPolicyHealth(),
      decisionPacket
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message, policyHealth: getPolicyHealth() }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    try {
      validateMatterId(id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
    }
    const deleted = deleteMatter(id);
    if (!deleted) {
      return NextResponse.json({ error: `Matter with ID ${id} not found` }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
