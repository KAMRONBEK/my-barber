import { firestoreDateToIso } from '../../utils/firestoreDates';

describe('firestoreDateToIso', () => {
  it('converts a Firestore Timestamp-shaped object via .toDate()', () => {
    const date = new Date('2026-01-15T10:00:00.000Z');
    const timestampLike = { toDate: () => date };
    expect(firestoreDateToIso(timestampLike)).toBe(date.toISOString());
  });

  it('converts a plain Date instance (what the Jest mock Firestore stores)', () => {
    const date = new Date('2026-01-15T10:00:00.000Z');
    expect(firestoreDateToIso(date)).toBe(date.toISOString());
  });

  it('converts an ISO string', () => {
    const iso = '2026-01-15T10:00:00.000Z';
    expect(firestoreDateToIso(iso)).toBe(iso);
  });

  it('falls back to epoch for null/undefined/garbage without throwing', () => {
    expect(() => firestoreDateToIso(null)).not.toThrow();
    expect(() => firestoreDateToIso(undefined)).not.toThrow();
    expect(() => firestoreDateToIso('not a date')).not.toThrow();
    expect(firestoreDateToIso(null)).toBe(new Date(0).toISOString());
  });
});
