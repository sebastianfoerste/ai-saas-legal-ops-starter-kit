import { NextResponse } from 'next/server';
import { saveMatter, type PersistedMatter } from '@core/storage';
import * as fs from 'fs';
import * as path from 'path';

const SEED_MATTERS = [
  {
    id: 'dust-saas-contract-intake',
    name: 'Regulated workspace MSA',
    schemaType: 'SaaSContractIntake',
    filename: 'saas-contract-intake.example.json',
    status: 'pending_review'
  },
  {
    id: 'dust-dpa-triage',
    name: 'Enterprise agent DPA markup',
    schemaType: 'DPATriage',
    filename: 'dpa-triage.example.json',
    status: 'pending_review'
  },
  {
    id: 'dust-ai-vendor-review',
    name: 'Model provider ZDR review',
    schemaType: 'AIVendorReview',
    filename: 'ai-vendor-review.example.json',
    status: 'pending_review'
  },
  {
    id: 'dust-open-source-review',
    name: 'Agent SDK licence check',
    schemaType: 'OpenSourceReview',
    filename: 'open-source-review.example.json',
    status: 'draft'
  },
  {
    id: 'dust-customer-commitment',
    name: 'EU processing commitment',
    schemaType: 'CustomerCommitment',
    filename: 'customer-commitment.example.json',
    status: 'pending_review'
  },
  {
    id: 'dust-product-launch-intake',
    name: 'Regulated teams agent builder',
    schemaType: 'ProductLaunchIntake',
    filename: 'product-launch-intake.example.json',
    status: 'pending_review'
  }
] satisfies Array<{
  id: string;
  name: string;
  schemaType: string;
  filename: string;
  status: PersistedMatter['status'];
}>;

export async function POST() {
  try {
    const examplesDir = path.resolve(process.cwd(), '../examples');
    const created: string[] = [];

    for (const item of SEED_MATTERS) {
      const filePath = path.join(examplesDir, item.filename);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const matter: PersistedMatter = {
          id: item.id,
          name: item.name,
          schemaType: item.schemaType,
          data,
          status: item.status,
          auditLog: [
            {
              timestamp: new Date().toISOString(),
              action: 'Synthetic Dust GC demo matter initialized',
              actor: 'System Seed',
              notes: 'Public-safe synthetic example for portfolio review'
            }
          ]
        };
        saveMatter(matter);
        created.push(item.id);
      }
    }

    return NextResponse.json({ success: true, seeded: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
