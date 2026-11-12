import { z } from 'zod';

// References stay as text until the workflow runtime resolves them.
export const operationReferencePattern = /\$\{\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\](?:(?:\.[A-Za-z_$][\w$]*)|(?:\[\d+\])|(?:\["(?:[^"\\]|\\.)*"\]))+\}/i;

export function configurationSchema(schema: z.ZodType): z.ZodType {
  if (schema.type === 'string') {
    return z.union([schema, z.string().regex(operationReferencePattern)]);
  }
  if (schema instanceof z.ZodObject) {
    return schema.extend(Object.fromEntries(Object.entries(schema.shape)
      .map(([key, field]) => [key, configurationSchema(field as z.ZodType)])));
  }
  if (schema instanceof z.ZodArray) {
    return schema.clone({ ...schema.def, element: configurationSchema(schema.element as z.ZodType) });
  }
  if (schema instanceof z.ZodDefault) {
    return configurationSchema(schema.unwrap() as z.ZodType).default(schema.def.defaultValue);
  }
  if (schema instanceof z.ZodOptional) return configurationSchema(schema.unwrap() as z.ZodType).optional();
  if (schema instanceof z.ZodNullable) return configurationSchema(schema.unwrap() as z.ZodType).nullable();
  return schema;
}

export function referencedOperationIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return [...value.matchAll(new RegExp(operationReferencePattern.source, 'gi'))].map((match) => match[1]);
  }
  if (Array.isArray(value)) return value.flatMap(referencedOperationIds);
  if (value && typeof value === 'object') return Object.values(value).flatMap(referencedOperationIds);
  return [];
}
