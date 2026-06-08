export const SCHEMA_TYPES = [
  'SaaSContractIntake',
  'DPATriage',
  'AIVendorReview',
  'OpenSourceReview',
  'CustomerCommitment',
  'ProductLaunchIntake'
] as const;

export type SchemaType = typeof SCHEMA_TYPES[number];

export interface WorkflowDefinition {
  id: string;
  name: string;
  prefix: string;
  schemaType: SchemaType;
}

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'saas-contract-intake',
    name: 'SaaS Contract Intake',
    prefix: 'saas-contract-intake',
    schemaType: 'SaaSContractIntake'
  },
  {
    id: 'dpa-triage',
    name: 'DPA Triage',
    prefix: 'dpa-triage',
    schemaType: 'DPATriage'
  },
  {
    id: 'ai-vendor-review',
    name: 'AI Vendor Review',
    prefix: 'ai-vendor-review',
    schemaType: 'AIVendorReview'
  },
  {
    id: 'open-source-review',
    name: 'Open-Source Review',
    prefix: 'open-source-review',
    schemaType: 'OpenSourceReview'
  },
  {
    id: 'customer-commitment',
    name: 'Customer Commitment',
    prefix: 'customer-commitment',
    schemaType: 'CustomerCommitment'
  },
  {
    id: 'product-launch-intake',
    name: 'Product Launch Intake',
    prefix: 'product-launch-intake',
    schemaType: 'ProductLaunchIntake'
  }
];

export const SCHEMA_FILE_BY_TYPE: Record<SchemaType, string> = Object.fromEntries(
  WORKFLOWS.map(workflow => [workflow.schemaType, `${workflow.prefix}.schema.json`])
) as Record<SchemaType, string>;

export function normalizeSchemaType(schemaType: string): string {
  return schemaType.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isSchemaType(schemaType: unknown): schemaType is SchemaType {
  return typeof schemaType === 'string'
    && SCHEMA_TYPES.some(allowed => normalizeSchemaType(allowed) === normalizeSchemaType(schemaType));
}

export function canonicalSchemaType(schemaType: string): SchemaType {
  const matched = SCHEMA_TYPES.find(allowed => normalizeSchemaType(allowed) === normalizeSchemaType(schemaType));
  if (!matched) {
    throw new Error(`Unsupported schema type: ${schemaType}`);
  }
  return matched;
}

export function schemaPrefixForType(schemaType: string): string {
  return WORKFLOWS.find(workflow => workflow.schemaType === canonicalSchemaType(schemaType))?.prefix
    ?? schemaType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
