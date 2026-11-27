/**
 * The business runs in Uzbekistan (Asia/Tashkent) while the server runs in UTC.
 * Uzbekistan has no daylight saving time, so a fixed offset is exact and does
 * not depend on the ICU data of the runtime.
 */
export const TASHKENT_OFFSET_MINUTES = 5 * 60;

const OFFSET_MS = TASHKENT_OFFSET_MINUTES * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** The instant shifted so that its UTC getters return Tashkent wall-clock values. */
function toWallClock(instant: string | Date): Date {
  return new Date(new Date(instant).getTime() + OFFSET_MS);
}

/** `YYYY-MM-DD` of the instant as seen in Tashkent. */
export function tashkentDay(instant: string | Date): string {
  return toWallClock(instant).toISOString().slice(0, 10);
}

/** Minutes since Tashkent midnight. */
export function tashkentMinutesOfDay(instant: string | Date): number {
  const d = toWallClock(instant);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** UTC bounds `[start, end)` of a Tashkent calendar day given as `YYYY-MM-DD…`. */
export function tashkentDayRange(date: string): { start: string; end: string } {
  const day = date.slice(0, 10);
  const startMs = Date.parse(`${day}T00:00:00.000Z`) - OFFSET_MS;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + DAY_MS).toISOString(),
  };
}

/** `28.11.2026, 14:00` — the format used in both Uzbek and Russian copy. */
export function formatTashkentDateTime(instant: string | Date): string {
  const iso = toWallClock(instant).toISOString();
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}.${month}.${year}, ${iso.slice(11, 16)}`;
}
