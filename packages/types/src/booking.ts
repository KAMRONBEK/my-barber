import { z } from 'zod';
import { IdSchema } from './common';

// Mirrors `BookingStatus` in backend/api/models/booking.ts.
export const BookingStatusSchema = z.enum([
  'pending_confirmation',
  'confirmed',
  'declined',
  'cancelled',
  'rescheduled',
  'completed',
  'no_show',
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingServiceRefSchema = z.object({
  id: IdSchema,
  name: z.string(),
  price: z.number().nonnegative(),
});
export type BookingServiceRef = z.infer<typeof BookingServiceRefSchema>;

// snake_case mobile contract — mirrors `BookingContract` in
// backend/api/models/booking.ts. This is the on-the-wire shape.
export const BookingContractSchema = z.object({
  id: IdSchema,
  status: BookingStatusSchema,
  timestamp: z.string().datetime(),
  previous_timestamp: z.string().datetime().nullable(),
  cancellation_reason: z.string().nullable(),
  barber_id: IdSchema,
  client_id: IdSchema,
  services: z.array(BookingServiceRefSchema),
  updated_at: z.string().datetime(),
});
export type BookingContract = z.infer<typeof BookingContractSchema>;

// camelCase Booking used in mobile state after normalization.
export const BookingSchema = z.object({
  id: IdSchema,
  status: BookingStatusSchema,
  timestamp: z.string().datetime(),
  previousTimestamp: z.string().datetime().nullable(),
  cancellationReason: z.string().nullable(),
  barberId: IdSchema,
  clientId: IdSchema,
  services: z.array(BookingServiceRefSchema),
  updatedAt: z.string().datetime(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const BookingCreateRequestSchema = z.object({
  barberId: IdSchema,
  serviceIds: z.array(IdSchema).min(1),
  timestamp: z.string().datetime(),
});
export type BookingCreateRequest = z.infer<typeof BookingCreateRequestSchema>;

export function bookingFromContract(c: BookingContract): Booking {
  return {
    id: c.id,
    status: c.status,
    timestamp: c.timestamp,
    previousTimestamp: c.previous_timestamp,
    cancellationReason: c.cancellation_reason,
    barberId: c.barber_id,
    clientId: c.client_id,
    services: c.services,
    updatedAt: c.updated_at,
  };
}
