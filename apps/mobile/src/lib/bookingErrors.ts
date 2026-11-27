// Turns a failed booking request into a translation key.

import { isAxiosError } from 'axios';

const BY_CODE: Record<string, string> = {
  SLOT_TAKEN: 'bookingErrors.slotTaken',
  PAST_TIME: 'bookingErrors.pastTime',
  INVALID_TIME: 'bookingErrors.pastTime',
  OUTSIDE_WORKING_HOURS: 'bookingErrors.outsideHours',
  INVALID_SERVICES: 'bookingErrors.invalidServices',
  BARBER_NOT_AVAILABLE: 'bookingErrors.barberUnavailable',
  NOT_STARTED: 'bookingErrors.notStarted',
};

export function bookingErrorKey(error: unknown, fallback = 'common.error'): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return 'auth.networkError';
  const { status, data } = error.response;
  const code = (data as { code?: string } | undefined)?.code;
  if (code && BY_CODE[code]) return BY_CODE[code]!;
  // A 409 without a code means the booking is no longer in the expected state.
  if (status === 409) return 'bookingErrors.changed';
  return fallback;
}
