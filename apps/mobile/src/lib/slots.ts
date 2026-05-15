// Slot derivation for the booking screen.
//
// Given:
//   - a target date (local time, day boundary)
//   - working hours for the barber on that weekday
//   - existing bookings (with their service durations)
//   - the total duration the client is trying to book
//
// We emit a grid of candidate start times, each tagged available/unavailable.
//
// The math intentionally mirrors backend/api expectations — the API doesn't
// expose a slot endpoint yet, so we derive client-side. Once the backend ships
// `GET /client/slots`, this file becomes the fallback for offline rendering.

import { calculateTotalDuration, type Service } from '@my-barber/types';
import {
  BOOKING_GRID_STEP_MINUTES,
} from '@my-barber/config';
import type { ApiExistingBooking } from './api';

export interface SlotPill {
  startAt: Date;
  endAt: Date;
  available: boolean;
}

export interface WorkingWindow {
  openMinutes: number; // minutes since midnight
  closeMinutes: number;
}

// Default operating window when the barber API doesn't expose hours yet.
// 09:00 → 21:00, matches the OD designs.
export const DEFAULT_WORKING_WINDOW: WorkingWindow = {
  openMinutes: 9 * 60,
  closeMinutes: 21 * 60,
};

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function endOfBooking(b: ApiExistingBooking): { start: Date; end: Date } {
  const start = new Date(b.timestamp);
  const services = (b.services ?? []).map<Service>((s) => ({
    id: String(s.id),
    barberId: String(s.barberId ?? ''),
    name: s.name,
    price: s.price,
    durationMinutes: s.durationMinutes,
  }));
  const minutes = calculateTotalDuration(services);
  const end = new Date(start.getTime() + Math.max(minutes, 30) * 60 * 1000);
  return { start, end };
}

export interface DeriveSlotsInput {
  day: Date;                 // local-time day boundary
  totalMinutes: number;      // from calculateTotalDuration(selectedServices)
  existing: ApiExistingBooking[];
  working?: WorkingWindow;
  stepMinutes?: number;
  now?: Date;                // injected for tests
}

export function deriveSlots(input: DeriveSlotsInput): SlotPill[] {
  const {
    day,
    totalMinutes,
    existing,
    working = DEFAULT_WORKING_WINDOW,
    stepMinutes = BOOKING_GRID_STEP_MINUTES,
    now = new Date(),
  } = input;

  if (totalMinutes <= 0) return [];

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);

  const open = new Date(start);
  open.setMinutes(working.openMinutes);

  const close = new Date(start);
  close.setMinutes(working.closeMinutes);

  const lastAcceptable = new Date(close.getTime() - totalMinutes * 60 * 1000);
  if (lastAcceptable.getTime() < open.getTime()) return [];

  // Precompute booked intervals.
  const booked = existing
    .map(endOfBooking)
    .filter((b) => !Number.isNaN(b.start.getTime()));

  const pills: SlotPill[] = [];
  for (
    let t = new Date(open);
    t.getTime() <= lastAcceptable.getTime();
    t = new Date(t.getTime() + stepMinutes * 60 * 1000)
  ) {
    const startAt = new Date(t);
    const endAt = new Date(t.getTime() + totalMinutes * 60 * 1000);

    let available = true;
    // Past slots are unavailable.
    if (startAt.getTime() < now.getTime()) available = false;
    // Overlap check.
    if (available) {
      for (const b of booked) {
        if (startAt.getTime() < b.end.getTime() && endAt.getTime() > b.start.getTime()) {
          available = false;
          break;
        }
      }
    }
    pills.push({ startAt, endAt, available });
  }

  return pills;
}

// Light dedup helper for grid rendering: ensures we don't re-render duplicate
// pills if the working window is misconfigured (e.g. close < open).
export function uniqueSlots(pills: SlotPill[]): SlotPill[] {
  const seen = new Set<string>();
  const out: SlotPill[] = [];
  for (const p of pills) {
    const k = p.startAt.toISOString();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

// Working window keyed by weekday. Slot picker reads this from a Barbershop
// (eventually); for now we use the constant window across the whole week.
export function workingWindowForWeekday(_weekday: number): WorkingWindow {
  return DEFAULT_WORKING_WINDOW;
}
