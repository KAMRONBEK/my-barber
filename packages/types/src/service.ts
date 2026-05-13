import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

export const ServiceSchema = z.object({
  id: IdSchema,
  barbershopId: IdSchema,
  name: z.string(),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default('UZS'),
  active: z.boolean().default(true),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Service = z.infer<typeof ServiceSchema>;
