import { BookingStatus } from '../models/booking';
import { normalizeBookingStatus } from './bookingContract';
import { tashkentMinutesOfDay } from './tashkentTime';

/**
 * Duration math mirrors `calculateTotalDuration` in `@my-barber/types`, which
 * the mobile slot grid uses, so the server and the app agree on overlaps.
 */
const BUFFER_MINUTES = 5;
const GRANULARITY_MINUTES = 30;
const DEFAULT_SERVICE_MINUTES = 30;

export const EXPIRED_REASON = 'expired';

export function bookingDurationMinutes(
  services: ReadonlyArray<{ durationMinutes?: number | null }>
): number {
  const sum = services.reduce((acc, s) => {
    const d = s.durationMinutes;
    return acc + (typeof d === 'number' && d > 0 ? d : DEFAULT_SERVICE_MINUTES);
  }, 0);
  const raw = sum + BUFFER_MINUTES * Math.max(0, services.length - 1);
  return Math.max(
    GRANULARITY_MINUTES,
    Math.ceil(raw / GRANULARITY_MINUTES) * GRANULARITY_MINUTES
  );
}

/**
 * A request the barber never answered is void once its start time has passed.
 * Derived on read, so no scheduled job is needed.
 */
export function isExpiredRequest(
  status: string | undefined,
  timestamp: string,
  now: number = Date.now()
): boolean {
  return (
    normalizeBookingStatus(status) === 'pending_confirmation' &&
    new Date(timestamp).getTime() < now
  );
}

export function effectiveBookingStatus(
  status: string | undefined,
  timestamp: string,
  now: number = Date.now()
): BookingStatus {
  return isExpiredRequest(status, timestamp, now)
    ? 'cancelled'
    : normalizeBookingStatus(status);
}

/** Whether a booking in this status occupies the barber's time. */
export function occupiesSlot(status: BookingStatus): boolean {
  return status !== 'cancelled' && status !== 'declined';
}

/**
 * `workingHours` is free text. Return a window only when it holds exactly one
 * unambiguous `HH:MM - HH:MM` range; anything else must never block a booking.
 */
export function parseWorkingWindow(
  text: unknown
): { open: number; close: number } | null {
  if (typeof text !== 'string') return null;
  const matches = [
    ...text.matchAll(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/g),
  ];
  if (matches.length !== 1) return null;
  const [, oh, om, ch, cm] = matches[0].map(Number);
  if (oh > 23 || om > 59 || ch > 24 || cm > 59) return null;
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  return close > open ? { open, close } : null;
}

export function fitsWorkingHours(
  timestamp: string,
  durationMinutes: number,
  workingHours: unknown
): boolean {
  const window = parseWorkingWindow(workingHours);
  if (!window) return true;
  const start = tashkentMinutesOfDay(timestamp);
  return start >= window.open && start + durationMinutes <= window.close;
}
