import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

export const BookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingSchema = z.object({
  id: IdSchema,
  clientId: IdSchema,
  barberId: IdSchema,
  barbershopId: IdSchema,
  serviceId: IdSchema,
  startAt: TimestampSchema,
  endAt: TimestampSchema,
  status: BookingStatusSchema.default('pending'),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default('UZS'),
  notes: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Booking = z.infer<typeof BookingSchema>;
