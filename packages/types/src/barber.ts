import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

export const BarberSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  barbershopId: IdSchema,
  displayName: z.string(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  serviceIds: z.array(IdSchema).default([]),
  active: z.boolean().default(true),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Barber = z.infer<typeof BarberSchema>;
