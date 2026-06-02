import AjvModule from 'ajv';
import addFormatsModule from 'ajv-formats';

// ESM/CJS interop fallback for NodeNext resolution
const Ajv: any = (AjvModule as any).default || AjvModule;
const addFormats: any = (addFormatsModule as any).default || addFormatsModule;

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

function getFriendlyRecommendation(err: any, schema: any): string {
  const propertyName = (err.keyword === 'required' ? err.params.missingProperty : err.instancePath.replace(/^\//, '')) || 'payload';
  const propSchema = schema.properties?.[propertyName];
  const description = propSchema?.description ? ` (${propSchema.description})` : '';

  let advice = '';
  switch (err.keyword) {
    case 'required':
      advice = `[Missing Field] The required field '${propertyName}' is missing.${description}`;
      break;
    case 'type':
      advice = `[Type Mismatch] The field '${propertyName}' must be a ${err.params.type}, but received a different type.${description}`;
      break;
    case 'enum':
      const allowed = err.params.allowedValues ? ` Allowed values: ${err.params.allowedValues.join(', ')}.` : '';
      advice = `[Invalid Value] The field '${propertyName}' must match one of the predefined options.${allowed}${description}`;
      break;
    case 'format':
      if (err.params.format === 'date') {
        advice = `[Format Error] The field '${propertyName}' must be a valid date in YYYY-MM-DD format.${description}`;
      } else {
        advice = `[Format Error] The field '${propertyName}' must match format "${err.params.format}".${description}`;
      }
      break;
    default:
      const path = err.instancePath ? `${err.instancePath} ` : '';
      advice = `[Validation Error] Field '${propertyName}' ${path}${err.message}.${description}`;
  }

  // Add policy context link if relevant
  if (propertyName === 'regulatedCustomer' || propertyName === 'customerSector' || propertyName === 'customerSegment') {
    advice += ` Refer to [escalation-rules.md](file:///Users/sebastian/Developer/ai-saas-legal-ops-starter-kit/policies/escalation-rules.md) for regulated routing boundaries.`;
  } else if (propertyName === 'trainingOnCustomerData' || propertyName === 'aiFeatures') {
    advice += ` Refer to [ai-vendor-use-policy.md](file:///Users/sebastian/Developer/ai-saas-legal-ops-starter-kit/policies/ai-vendor-use-policy.md) for model training policies.`;
  }
  
  return advice;
}

/**
 * Validates a JSON data object against a provided JSON Schema definition.
 * 
 * @param schema The JSON Schema object.
 * @param data The JSON data instance to validate.
 * @returns An object containing the validation state and any parsed errors.
 */
export function validateJSON(schema: any, data: any): ValidationResult {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);
    
    if (!valid && validate.errors) {
      const errors = validate.errors.map((err: any) => getFriendlyRecommendation(err, schema));
      return { valid: false, errors };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, errors: [error.message] };
  }
}
