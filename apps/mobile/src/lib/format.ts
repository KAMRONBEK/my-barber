// Lightweight formatters. Locale-aware but offline — no Intl polyfills.
// UZS: thin-space thousands, no minor unit.
// Time: 24h, zero-padded.
// Date: weekday + day-month (Uzbek style "13-may").

import i18n from './i18n';

const THIN_SPACE = ' ';

// Thousands-grouped digits, no currency unit — e.g. "100 000". Shared by
// formatUZS/formatPriceFrom and by callers that already label the unit
// elsewhere (e.g. a stat tile captioned "NARX") and don't want it repeated.
export function formatAmountGrouped(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const sign = safe < 0 ? '-' : '';
  const digits = Math.abs(safe).toString();
  const parts: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) {
    parts.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return `${sign}${parts.join(THIN_SPACE)}`;
}

export function formatUZS(amount: number): string {
  return `${formatAmountGrouped(amount)} ${i18n.t('common.sum')}`;
}

export function formatPriceFrom(amount: number): string {
  // Uzbek "{n} so'mdan" / Russian "от {n} сум". The plural-aware suffix lives
  // in the locale file as `common.from`.
  return i18n.t('common.from', { value: formatAmountGrouped(amount) });
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatTimeOfDay(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return `${formatTimeOfDay(start)} – ${formatTimeOfDay(end)}`;
}

export function formatWeekdayShort(d: Date): string {
  return i18n.t(`weekday.short.${d.getDay()}`);
}

export function formatWeekdayLong(d: Date): string {
  return i18n.t(`weekday.long.${d.getDay()}`);
}

// "13-may" in uz, "13 мая" in ru.
export function formatDayMonth(d: Date): string {
  const month = i18n.t(`month.${d.getMonth()}`);
  const day = d.getDate();
  return i18n.language === 'ru' ? `${day} ${month}` : `${day}-${month}`;
}

// Render "1 soat 15 min" / "45 min".
export function formatDurationMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return i18n.t('booking.duration', { minutes: safe });
  const hours = Math.floor(safe / 60);
  const rem = safe - hours * 60;
  if (rem === 0) {
    return i18n.t('booking.durationHrMin', { hours, minutes: 0 });
  }
  return i18n.t('booking.durationHrMin', { hours, minutes: rem });
}

// ISO `YYYY-MM-DD` in local time (not UTC). Used for the slot query.
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Build a Date at the start of the local day for `d`.
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

// Add days, keeping local time intact.
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

// Booking status wire values (Firestore `BookingStatus`) -> localized label
// and display tone, shared by the client and barber booking-history lists so
// neither renders the raw snake_case enum.
export function bookingStatusLabel(status: string): string {
  return i18n.exists(`bookingStatus.${status}`) ? i18n.t(`bookingStatus.${status}`) : status;
}

export function bookingStatusTone(status: string): 'success' | 'danger' | 'accent' {
  if (status === 'confirmed' || status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'declined' || status === 'no_show') return 'danger';
  return 'accent';
}

// A pending_confirmation booking whose time has already passed is a request
// the barber never answered — the backend's `upcoming` filter is status-only
// (no timestamp cutoff), so these otherwise sit in the upcoming list forever
// looking like a live appointment. Surface that distinctly instead.
export function effectiveBookingStatus(
  status: string,
  timestampIso: string,
): { label: string; tone: 'success' | 'warning' | 'danger' | 'accent' } {
  if (status === 'pending_confirmation' && new Date(timestampIso).getTime() < Date.now()) {
    return { label: i18n.t('bookingStatus.expired'), tone: 'warning' };
  }
  return { label: bookingStatusLabel(status), tone: bookingStatusTone(status) };
}
