import { NextResponse } from 'next/server';
import {
  assertMatterCreationAllowed,
  isMatterStatus,
  listMattersWithDiagnostics,
  saveMatter,
  validateMatterId,
  type PersistedMatter
} from '@core/storage';
import { calculateRisk, getPolicyHealth } from '@core/risk-scoring';
import { validateJSON } from '@core/validate';
import { createLegalActionPlan } from '@core/action-plan';
import { createEvidencePack } from '@core/evidence-pack';
import { createContractPlaybookReview } from '@core/contract-playbook';
import { createRegulatoryObligationMatrix } from '@core/regulatory-matrix';
import { createDecisionPacket } from '@core/decision-packet';
import { isSchemaType, loadSchemaForType } from '@core/workflows';

export async function GET() {
  try {
    const { matters, diagnostics } = listMattersWithDiagnostics();
    const enriched = matters.map(matter => {
      const risk = calculateRisk(matter.schemaType, matter.data);
      const actionPlan = createLegalActionPlan(matter.schemaType, matter.data, { risk });
      const evidencePack = createEvidencePack(matter.schemaType, matter.data, { actionPlan, risk });
      const regulatoryMatrix = createRegulatoryObligationMatrix(matter.schemaType, matter.data, { actionPlan, risk });

      return {
        ...matter,
        riskLevel: risk.level,
        reviewGate: actionPlan.reviewGate,
        evidenceReadiness: evidencePack.readiness,
        regulatoryMatrixGaps: regulatoryMatrix.gaps.length
      };
    });

    const sorted = enriched.sort((a, b) => {
      const aTime = a.auditLog[a.auditLog.length - 1]?.timestamp || '';
      const bTime = b.auditLog[b.auditLog.length - 1]?.timestamp || '';
      return bTime.localeCompare(aTime);
    });

    return NextResponse.json({
      matters: sorted,
      diagnostics,
      policyHealth: getPolicyHealth()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message, policyHealth: getPolicyHealth() }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, schemaType, data, actor = 'Web UI Wizard', notes = 'Created via Intake Wizard' } = body;
    const status = body.status ?? 'draft';

    if (!id || !name || !schemaType || !data) {
      return NextResponse.json({ error: 'Missing required fields: id, name, schemaType, data' }, { status: 400 });
    }

    try {
      validateMatterId(id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
    }

    if (!isMatterStatus(status)) {
      return NextResponse.json({ error: `Unsupported matter status: ${status}` }, { status: 400 });
    }

    try {
      assertMatterCreationAllowed(status);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
    }

    if (!isSchemaType(schemaType)) {
      return NextResponse.json({ error: `Unsupported schema type: ${schemaType}` }, { status: 400 });
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'data must be a JSON object' }, { status: 400 });
    }

    const generatedAt = new Date().toISOString();
    const schema = loadSchemaForType(schemaType);
    const validation = validateJSON(schema, data);
    if (!validation.valid && status !== 'draft') {
      return NextResponse.json({
        error: 'Invalid payloads can only be saved as explicit draft matters',
        validation
      }, { status: 422 });
    }

    const risk = calculateRisk(schemaType, data);
    const actionPlan = createLegalActionPlan(schemaType, data, { risk });
    const evidencePack = createEvidencePack(schemaType, data, { actionPlan, generatedAt, risk });
    const regulatoryMatrix = createRegulatoryObligationMatrix(schemaType, data, { actionPlan, generatedAt, risk });
    const contractPlaybook = schemaType === 'SaaSContractIntake'
      ? createContractPlaybookReview(data, { actionPlan, generatedAt, risk })
      : undefined;

    const matter: PersistedMatter = {
      id,
      name,
      schemaType,
      data,
      status,
      validationErrors: validation.valid ? undefined : validation.errors ?? ['Payload failed validation'],
      auditLog: [
        {
          timestamp: generatedAt,
          action: 'Matter created',
          actor,
          notes: validation.valid ? notes : `${notes} Validation errors captured on draft.`
        }
      ]
    };

    saveMatter(matter);
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
      success: true,
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
