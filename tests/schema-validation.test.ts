import { describe, test, expect } from 'vitest';
import { validateJSON } from '../src/validate.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('JSON Schema Validation Tests', () => {
  const schemasDir = path.join(__dirname, '../schemas');
  const examplesDir = path.join(__dirname, '../examples');

  const files = [
    { name: 'SaaS Contract Intake', prefix: 'saas-contract-intake' },
    { name: 'DPA Triage', prefix: 'dpa-triage' },
    { name: 'AI Vendor Review', prefix: 'ai-vendor-review' },
    { name: 'Open-Source Review', prefix: 'open-source-review' },
    { name: 'Customer Commitment', prefix: 'customer-commitment' },
    { name: 'Product Launch Intake', prefix: 'product-launch-intake' }
  ];

  files.forEach(file => {
    test(`should validate synthetic example for ${file.name} against schema`, () => {
      const schemaPath = path.join(schemasDir, `${file.prefix}.schema.json`);
      const examplePath = path.join(examplesDir, `${file.prefix}.example.json`);

      expect(fs.existsSync(schemaPath)).toBe(true);
      expect(fs.existsSync(examplePath)).toBe(true);

      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));

      const result = validateJSON(schema, example);
      
      if (!result.valid) {
        console.error(`Validation failed for ${file.name}:`, result.errors);
      }

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });
});
