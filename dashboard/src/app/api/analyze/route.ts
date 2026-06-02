import { NextResponse } from 'next/server';
import { calculateRisk } from '@core/risk-scoring';
import { validateJSON, type ValidationResult } from '@core/validate';
import { createLegalActionPlan } from '@core/action-plan';
import { createEvidencePack } from '@core/evidence-pack';
import { createContractPlaybookReview } from '@core/contract-playbook';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schemaType, data } = body;

    if (!schemaType || !data) {
      return NextResponse.json({ error: 'Missing schemaType or data' }, { status: 400 });
    }

    // Try to load schema
    const schemaFilename = schemaType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const schemaPath = path.resolve(process.cwd(), `../schemas/${schemaFilename}.schema.json`);
    
    let validation: ValidationResult = { valid: true, errors: [] };
    if (fs.existsSync(schemaPath)) {
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      validation = validateJSON(schema, data);
    }

    const risk = calculateRisk(schemaType, data);
    const actionPlan = createLegalActionPlan(schemaType, data, { risk });
    const evidencePack = createEvidencePack(schemaType, data, { actionPlan, risk });
    const contractPlaybook = schemaType === 'SaaSContractIntake'
      ? createContractPlaybookReview(data, { actionPlan, risk })
      : undefined;

    return NextResponse.json({
      validation,
      risk,
      actionPlan,
      evidencePack,
      contractPlaybook
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
