import { z } from 'zod';

// Strict identifier refinement: rejects leading or trailing whitespace
export const strictIdentifierSchema = z
  .string()
  .min(1, 'Identifier cannot be empty')
  .refine((val) => val === val.trim(), {
    message: 'Identifier must not contain leading or trailing whitespace',
  });

// Safe positive integer version refinement
export const versionSchema = z
  .number()
  .int('Version must be an integer')
  .positive('Version must be positive')
  .refine((val) => Number.isSafeInteger(val), {
    message: 'Version must be a safe integer',
  });

// Raw payload schema prior to normalization
export const rawPayloadSchema = z
  .object({
    title: z.string().refine((val) => val.trim().length > 0, {
      message: 'Title must be non-blank after trimming',
    }),
    company: z.string().refine((val) => val.trim().length > 0, {
      message: 'Company must be non-blank after trimming',
    }),
    location: z.string().refine((val) => val.trim().length > 0, {
      message: 'Location must be non-blank after trimming',
    }),
    experienceMin: z.number().int().min(0).max(50),
    experienceMax: z.number().int().min(0).max(50),
    applyUrl: z
      .string()
      .url('applyUrl must be a valid URL')
      .refine((val) => val.startsWith('https://'), {
        message: 'applyUrl must use https:// protocol',
      }),
    skills: z
      .array(
        z.string().refine((val) => val.trim().length > 0, {
          message: 'Skill string cannot be blank',
        })
      )
      .min(1, 'At least one skill must be provided'),
  })
  .refine((val) => val.experienceMin <= val.experienceMax, {
    message: 'experienceMin cannot be greater than experienceMax',
    path: ['experienceMin'],
  });

// Complete event ingestion schema with discriminated union
export const eventInputSchema = z.discriminatedUnion('operation', [
  z.object({
    tenantId: strictIdentifierSchema,
    sourceId: strictIdentifierSchema,
    eventId: strictIdentifierSchema,
    externalJobId: strictIdentifierSchema,
    version: versionSchema,
    operation: z.literal('upsert'),
    payload: rawPayloadSchema,
  }),
  z.object({
    tenantId: strictIdentifierSchema,
    sourceId: strictIdentifierSchema,
    eventId: strictIdentifierSchema,
    externalJobId: strictIdentifierSchema,
    version: versionSchema,
    operation: z.literal('archive'),
    payload: z.undefined().optional(),
  }),
]);

export type ValidatedEventInput = z.infer<typeof eventInputSchema>;

export interface ValidationSuccess {
  success: true;
  data: ValidatedEventInput;
}

export interface ValidationFailure {
  success: false;
  errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateEventInput(input: unknown): ValidationResult {
  const result = eventInputSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}
