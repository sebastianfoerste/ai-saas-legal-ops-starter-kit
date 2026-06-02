import { NextResponse } from 'next/server';
import { saveMatter, type PersistedMatter } from '@core/storage';
import * as fs from 'fs';
import * as path from 'path';

const SEED_MATTERS = [
  {
    id: 'saas-contract-intake',
    name: 'Enterprise SaaS MSA - SwissBank',
    schemaType: 'SaaSContractIntake',
    filename: 'saas-contract-intake.example.json'
  },
  {
    id: 'dpa-triage',
    name: 'Customer Support Zendesk Triage',
    schemaType: 'DPATriage',
    filename: 'dpa-triage.example.json'
  },
  {
    id: 'ai-vendor-review',
    name: 'Codegen AI Copilot Vendor Audit',
    schemaType: 'AIVendorReview',
    filename: 'ai-vendor-review.example.json'
  },
  {
    id: 'open-source-review',
    name: 'Weak Copyleft SDK Dependency Check',
    schemaType: 'OpenSourceReview',
    filename: 'open-source-review.example.json'
  },
  {
    id: 'customer-commitment',
    name: 'SLA Custom Commitment Rider',
    schemaType: 'CustomerCommitment',
    filename: 'customer-commitment.example.json'
  },
  {
    id: 'product-launch-intake',
    name: 'Automated Loan Underwriting Launch',
    schemaType: 'ProductLaunchIntake',
    filename: 'product-launch-intake.example.json'
  }
];

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
          status: item.id === 'saas-contract-intake' || item.id === 'product-launch-intake' ? 'pending_review' : 'draft',
          auditLog: [
            {
              timestamp: new Date().toISOString(),
              action: 'Matter initialized from starter kit template',
              actor: 'System Seed',
              notes: 'Pre-populated example data'
            }
          ]
        };
        saveMatter(matter);
        created.push(item.id);
      }
    }

    return NextResponse.json({ success: true, seeded: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
