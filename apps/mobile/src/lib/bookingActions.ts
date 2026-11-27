// What can be done with a booking, by status and start time. Mirrors the rules
// in the API (backend/api/services/bookingService.ts), which has the final say.

import type { QueryClient } from '@tanstack/react-query';

export type BarberAction = 'confirm' | 'decline' | 'cancel' | 'complete' | 'noShow';

const AGREED = new Set(['confirmed', 'rescheduled']);

export function isAgreed(status: string | undefined): boolean {
  return AGREED.has(status ?? '');
}

export function barberActions(
  status: string | undefined,
  timestamp: string,
  now: number = Date.now(),
): BarberAction[] {
  const started = new Date(timestamp).getTime() <= now;
  if (status === 'pending_confirmation') {
    // An unanswered request is void once its time has passed.
    return started ? [] : ['confirm', 'decline'];
  }
  if (isAgreed(status)) {
    // Before the visit it can be called off; afterwards it gets an outcome.
    return started ? ['complete', 'noShow'] : ['cancel'];
  }
  return [];
}

/** Cancelled and declined bookings free the barber's time. */
export function occupiesTime(status: string | undefined): boolean {
  return status !== 'cancelled' && status !== 'declined';
}

export function isUpcoming(
  booking: { status?: string; timestamp: string },
  now: number = Date.now(),
): boolean {
  return (
    (booking.status === 'pending_confirmation' || isAgreed(booking.status)) &&
    new Date(booking.timestamp).getTime() >= now
  );
}

// The barber screens read bookings and earnings under these key prefixes.
const BARBER_QUERY_KEYS = [
  ['barber-bookings'],
  ['barber', 'bookings'],
  ['barber-earnings'],
  ['barber', 'earnings'],
];

export function invalidateBarberBookings(queryClient: QueryClient): void {
  for (const queryKey of BARBER_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
