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
      const errors = validate.errors.map((err: any) => {
        const path = err.instancePath ? `${err.instancePath} ` : '';
        return `${path}${err.message}`.trim();
      });
      return { valid: false, errors };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, errors: [error.message] };
  }
}
