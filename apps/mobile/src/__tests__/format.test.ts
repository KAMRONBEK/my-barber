// Format helpers — thin but critical (currency formatting is exposed
// throughout the UI and ought to be exact).

import {
  formatUZS,
  formatPriceFrom,
  pad2,
  formatTimeOfDay,
  formatTimeRange,
  formatDurationMinutes,
  toDateKey,
} from '../lib/format';

describe('format', () => {
  it('pads single-digit numbers', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(7)).toBe('07');
    expect(pad2(13)).toBe('13');
  });

  it('formats UZS with thin-space groupings and the localized suffix', () => {
    const out = formatUZS(140000);
    expect(out).toMatch(/140 000/); // 140 000 (thin space)
    expect(out.endsWith("so'm")).toBe(true);
  });

  it('formats price-from with the localized template', () => {
    const out = formatPriceFrom(180000);
    expect(out).toContain('180 000');
    expect(out).toMatch(/so'mdan$/);
  });

  it('renders time of day in 24-hour zero-padded form', () => {
    const d = new Date(2026, 4, 13, 9, 5, 0);
    expect(formatTimeOfDay(d)).toBe('09:05');
  });

  it('renders a slot end time exactly N minutes after start', () => {
    const d = new Date(2026, 4, 13, 16, 30, 0);
    expect(formatTimeRange(d, 75)).toBe('16:30 – 17:45');
  });

  it('formats duration: < 60 → "{n} min", >= 60 → "{h} soat {m} min"', () => {
    expect(formatDurationMinutes(45)).toMatch(/45.*min/);
    expect(formatDurationMinutes(75)).toMatch(/1.*soat.*15.*min/);
    expect(formatDurationMinutes(120)).toMatch(/2.*soat/);
  });

  it('emits ISO date keys in local time', () => {
    expect(toDateKey(new Date(2026, 4, 13))).toBe('2026-05-13');
  });
});
