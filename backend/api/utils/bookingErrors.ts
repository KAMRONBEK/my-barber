import type { Response } from 'express';

const BOOKING_ERRORS = {
  INVALID_TIME: [400, 'Booking time is not a valid date and time'],
  PAST_TIME: [400, 'Booking time is in the past'],
  OUTSIDE_WORKING_HOURS: [400, 'Barber does not work at this time'],
  INVALID_SERVICES: [400, 'Selected services are not offered by this barber'],
  BARBER_NOT_AVAILABLE: [404, 'Barber is not available for booking'],
  SLOT_TAKEN: [409, 'This time is already booked'],
  NOT_STARTED: [409, 'Booking has not started yet'],
} as const;

export type BookingErrorCode = keyof typeof BOOKING_ERRORS;

/** A booking rule the request broke; routes turn it into `{ ok, error, code }`. */
export class BookingError extends Error {
  readonly status: number;

  constructor(readonly code: BookingErrorCode) {
    super(BOOKING_ERRORS[code][1]);
    this.name = 'BookingError';
    this.status = BOOKING_ERRORS[code][0];
  }
}

/** Respond to a broken booking rule. Returns false for any other error. */
export function sendBookingError(res: Response, error: unknown): boolean {
  if (!(error instanceof BookingError)) return false;
  res
    .status(error.status)
    .json({ ok: false, error: error.message, code: error.code });
  return true;
}
