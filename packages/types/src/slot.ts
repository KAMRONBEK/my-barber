import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

export const SlotSchema = z.object({
  barberId: IdSchema,
  startAt: TimestampSchema,
  endAt: TimestampSchema,
  available: z.boolean(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const SlotQuerySchema = z.object({
  barbershopId: IdSchema.optional(),
  barberId: IdSchema.optional(),
  serviceId: IdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type SlotQuery = z.infer<typeof SlotQuerySchema>;
