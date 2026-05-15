import { z } from 'zod';
import { IdSchema } from './common';

export const SlotSchema = z.object({
  barberId: IdSchema,
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  available: z.boolean(),
});
export type Slot = z.infer<typeof SlotSchema>;

// Slot availability query for a multi-service booking. Pass every service
// the client intends to book; the server uses calculateTotalDuration() from
// ./duration to size each slot.
export const SlotQuerySchema = z.object({
  barberId: IdSchema,
  serviceIds: z.array(IdSchema).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type SlotQuery = z.infer<typeof SlotQuerySchema>;
