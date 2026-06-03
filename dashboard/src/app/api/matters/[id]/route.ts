import { NextResponse } from 'next/server';
import { loadMatter, deleteMatter } from '@core/storage';
import { calculateRisk } from '@core/risk-scoring';
import { validateJSON, type ValidationResult } from '@core/validate';
import { createLegalActionPlan } from '@core/action-plan';
import { createEvidencePack } from '@core/evidence-pack';
import { createContractPlaybookReview } from '@core/contract-playbook';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matter = loadMatter(id);
    if (!matter) {
      return NextResponse.json({ error: `Matter with ID ${id} not found` }, { status: 404 });
    }

    // Try to load schema
    const schemaFilename = matter.schemaType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const schemaPath = path.resolve(process.cwd(), `../schemas/${schemaFilename}.schema.json`);
    
    let validation: ValidationResult = { valid: true, errors: [] };
    if (fs.existsSync(schemaPath)) {
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      validation = validateJSON(schema, matter.data);
    }

    const risk = calculateRisk(matter.schemaType, matter.data);
    const actionPlan = createLegalActionPlan(matter.schemaType, matter.data, { risk });
    const evidencePack = createEvidencePack(matter.schemaType, matter.data, { actionPlan, risk });
    const contractPlaybook = matter.schemaType === 'SaaSContractIntake'
      ? createContractPlaybookReview(matter.data, { actionPlan, risk })
      : undefined;

    return NextResponse.json({
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
