import { NextResponse } from 'next/server';
import { isMatterStatus, listMatters, saveMatter, type PersistedMatter } from '@core/storage';
import { calculateRisk } from '@core/risk-scoring';
import { validateJSON } from '@core/validate';
import { createLegalActionPlan } from '@core/action-plan';
import { createEvidencePack } from '@core/evidence-pack';
import { createContractPlaybookReview } from '@core/contract-playbook';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    const matters = listMatters();
    const enriched = matters.map(matter => {
      const risk = calculateRisk(matter.schemaType, matter.data);
      const actionPlan = createLegalActionPlan(matter.schemaType, matter.data, { risk });
      const evidencePack = createEvidencePack(matter.schemaType, matter.data, { actionPlan, risk });

      return {
        ...matter,
        riskLevel: risk.level,
        reviewGate: actionPlan.reviewGate,
        evidenceReadiness: evidencePack.readiness
      };
    });

    return NextResponse.json(enriched.sort((a, b) => {
      const aTime = a.auditLog[a.auditLog.length - 1]?.timestamp || '';
      const bTime = b.auditLog[b.auditLog.length - 1]?.timestamp || '';
      return bTime.localeCompare(aTime);
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
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

    if (!isMatterStatus(status)) {
      return NextResponse.json({ error: `Unsupported matter status: ${status}` }, { status: 400 });
    }

    // Try to load schema
    const schemaFilename = schemaType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const schemaPath = path.resolve(process.cwd(), `../schemas/${schemaFilename}.schema.json`);
    
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ error: `Schema for type ${schemaType} not found` }, { status: 404 });
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const validation = validateJSON(schema, data);

    const risk = calculateRisk(schemaType, data);
    const actionPlan = createLegalActionPlan(schemaType, data, { risk });
    const evidencePack = createEvidencePack(schemaType, data, { actionPlan, risk });
    const contractPlaybook = schemaType === 'SaaSContractIntake'
      ? createContractPlaybookReview(data, { actionPlan, risk })
      : undefined;

    const matter: PersistedMatter = {
      id,
      name,
      schemaType,
      data,
      status,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'Matter created',
          actor,
          notes
        }
      ]
    };

    saveMatter(matter);

    return NextResponse.json({
      success: true,
      matter,
      validation,
      risk,
      actionPlan,
      evidencePack,
      contractPlaybook
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
