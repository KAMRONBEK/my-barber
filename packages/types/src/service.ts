import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common';

// Mirrors `BarberService` in backend/api/models/barber.ts. `price` is whole
// UZS units (no minor unit). `durationMinutes` is optional in storage;
// consumers should fall back to DEFAULT_SERVICE_DURATION_MINUTES (see ./duration).
export const ServiceSchema = z.object({
  id: IdSchema,
  barberId: IdSchema,
  name: z.string(),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive().optional(),
  catalogServiceId: IdSchema.optional(),
  isActive: z.boolean().optional(),
  createdAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema.optional(),
});
export type Service = z.infer<typeof ServiceSchema>;
