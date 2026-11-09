import { z } from 'zod';

export const fieldTypes = ['text', 'textarea', 'richtext', 'number', 'boolean', 'date', 'image', 'video', 'color', 'icon', 'select', 'json', 'array'] as const;

const nameRule = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'letters, digits, underscore');

// Fields inside an "array" field (a list of objects) are one level deep: they cannot be arrays themselves.
const leafFieldSchema = z.object({
  name: nameRule,
  label: z.string().optional(),
  type: z.enum(fieldTypes.filter((t) => t !== 'array') as ['text']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

export const fieldSchema = z.object({
  name: nameRule,
  label: z.string().optional(),
  type: z.enum(fieldTypes),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  /** For type "array": the fields of each item. */
  fields: z.array(leafFieldSchema).optional(),
});
export type Field = z.infer<typeof fieldSchema>;

/** Validates entry data against a content type's fields. Returns cleaned data and any errors. */
export function validateData(fields: Field[], data: Record<string, unknown>, prefix = '') {
  const errors: string[] = [];
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = data[f.name];
    const at = prefix + f.name;
    if (v === undefined || v === null || v === '' || (f.type === 'array' && Array.isArray(v) && v.length === 0)) {
      if (f.required) errors.push(`${at} is required`);
      continue;
    }
    switch (f.type) {
      case 'number':
        if (typeof v !== 'number') errors.push(`${at} must be a number`);
        break;
      case 'boolean':
        if (typeof v !== 'boolean') errors.push(`${at} must be a boolean`);
        break;
      case 'select':
        if (typeof v !== 'string' || (f.options?.length && !f.options.includes(v))) errors.push(`${at} must be one of ${f.options?.join(', ')}`);
        break;
      case 'color':
        if (typeof v !== 'string' || !/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) errors.push(`${at} must be a colour like #7c3aed`);
        break;
      case 'date':
        if (typeof v !== 'string' || isNaN(Date.parse(v))) errors.push(`${at} must be a date`);
        break;
      case 'json':
        break;
      case 'array': {
        if (!Array.isArray(v)) { errors.push(`${at} must be a list`); break; }
        const items: Record<string, unknown>[] = [];
        v.forEach((item, i) => {
          if (item === null || typeof item !== 'object' || Array.isArray(item)) { errors.push(`${at}[${i + 1}] must be an object`); return; }
          const r = validateData((f.fields ?? []) as Field[], item as Record<string, unknown>, `${at}[${i + 1}].`);
          errors.push(...r.errors);
          items.push(r.data);
        });
        out[f.name] = items;
        continue;
      }
      default:
        if (typeof v !== 'string') errors.push(`${at} must be text`);
    }
    out[f.name] = v;
  }
  return { errors, data: out };
}
