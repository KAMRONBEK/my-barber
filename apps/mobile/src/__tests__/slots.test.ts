// Unit coverage for deriveSlots — this is the single most important piece
// of client-side logic in the vertical slice. It powers the live slot grid
// recalc when the user toggles services.

import { calculateTotalDuration } from '@my-barber/types';
import {
  deriveSlots,
  DEFAULT_WORKING_WINDOW,
  type WorkingWindow,
} from '../lib/slots';

const DAY = new Date(2026, 4, 13, 0, 0, 0, 0); // 2026-05-13 local midnight

function at(hour: number, minute = 0): Date {
  const d = new Date(DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('deriveSlots', () => {
  it('returns an empty grid when no services are selected', () => {
    const slots = deriveSlots({
      day: DAY,
      totalMinutes: 0,
      existing: [],
      now: at(0),
    });
    expect(slots).toEqual([]);
  });

  it('produces 30-min step grid across 09:00–21:00 when the window is the default', () => {
    const slots = deriveSlots({
      day: DAY,
      totalMinutes: 30,
      existing: [],
      now: at(0),
    });
    // First slot is 09:00, then 15-min steps (BOOKING_GRID_STEP_MINUTES).
    expect(slots[0].startAt.getHours()).toBe(9);
    expect(slots[0].startAt.getMinutes()).toBe(0);
    // Last accepted start must fit a 30-min booking before 21:00.
    const last = slots[slots.length - 1];
    expect(last.endAt.getHours()).toBeLessThanOrEqual(21);
  });

  it('marks slots overlapping existing bookings as unavailable', () => {
    const slots = deriveSlots({
      day: DAY,
      totalMinutes: 30,
      existing: [
        {
          id: 'b1',
          timestamp: at(10, 0).toISOString(),
          services: [
            {
              id: 's1',
              barberId: 'x',
              name: 'cut',
              price: 0,
              durationMinutes: 30,
            },
          ],
        },
      ],
      now: at(0),
    });

    // Anything 10:00-ish should be unavailable. With a 15-min grid step the
    // overlap window covers 09:45 → 10:30 inclusive of the booking duration.
    const at10 = slots.find(
      (s) =>
        s.startAt.getHours() === 10 && s.startAt.getMinutes() === 0,
    );
    expect(at10?.available).toBe(false);
  });

  it('past slots are unavailable when now is mid-day', () => {
    const slots = deriveSlots({
      day: DAY,
      totalMinutes: 30,
      existing: [],
      now: at(12, 0),
    });
    const morningSlot = slots.find((s) => s.startAt.getHours() === 9);
    const afternoonSlot = slots.find((s) => s.startAt.getHours() === 14);
    expect(morningSlot?.available).toBe(false);
    expect(afternoonSlot?.available).toBe(true);
  });

  it('respects working window shorter than the default', () => {
    const window: WorkingWindow = { openMinutes: 10 * 60, closeMinutes: 12 * 60 };
    const slots = deriveSlots({
      day: DAY,
      totalMinutes: 60,
      existing: [],
      working: window,
      now: at(0),
    });
    expect(slots[0].startAt.getHours()).toBe(10);
    // 60-min booking must end by 12:00, so last viable start is 11:00.
    const last = slots[slots.length - 1];
    expect(last.endAt.getHours()).toBeLessThanOrEqual(12);
  });
});

describe('calculateTotalDuration ↔ deriveSlots', () => {
  // Sanity check: the booking screen flow chains these two functions. We
  // verify the math matches OD's stated examples.
  it('30 + 5 buffer + 15 → 50 → rounded up to 60', () => {
    const total = calculateTotalDuration([
      { durationMinutes: 30 },
      { durationMinutes: 15 },
    ]);
    expect(total).toBe(60);

    const slots = deriveSlots({
      day: DAY,
      totalMinutes: total,
      existing: [],
      working: DEFAULT_WORKING_WINDOW,
      now: at(0),
    });
    // With a 60-min booking, every slot's endAt should be 60 min after startAt.
    for (const s of slots) {
      expect(s.endAt.getTime() - s.startAt.getTime()).toBe(60 * 60 * 1000);
    }
  });
});
