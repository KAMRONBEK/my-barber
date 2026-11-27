import { listBarbers } from '../lib/barberList';
import { nextBooking, type ClientBooking } from '../lib/bookings';
import { serviceMinutes } from '../lib/duration';
import { openState } from '../lib/openState';
import type { ApiBarberFull } from '../lib/api';

/** `hour:minute` in Tashkent as an instant. */
const tashkent = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 10, 27, hour - 5, minute));

describe('visit duration', () => {
  it('adds up the services, 30 minutes for one without a duration', () => {
    expect(serviceMinutes([{ durationMinutes: 40 }])).toBe(40);
    expect(serviceMinutes([{ durationMinutes: 40 }, {}])).toBe(70);
    expect(serviceMinutes([])).toBe(30);
    expect(serviceMinutes(undefined)).toBe(30);
  });
});

describe('open state', () => {
  const hours = '09:00 - 18:00';

  it('follows the working hours in Tashkent time', () => {
    expect(openState(hours, tashkent(8, 59))).toBe('closed');
    expect(openState(hours, tashkent(9))).toBe('open');
    expect(openState(hours, tashkent(17, 30))).toBe('closing');
    expect(openState(hours, tashkent(18))).toBe('closed');
  });

  it('says nothing when the hours are unclear', () => {
    expect(openState(undefined, tashkent(10))).toBeNull();
    expect(openState('call me', tashkent(10))).toBeNull();
    expect(openState('09:00-13:00, 14:00-18:00', tashkent(10))).toBeNull();
  });
});

describe('barber list', () => {
  const barber = (id: string, extra: Partial<ApiBarberFull> = {}) =>
    ({ id, firstName: id, lastName: 'Usta', services: [], ...extra }) as ApiBarberFull;
  const near = barber('Near', {
    location: { latitude: 41.31, longitude: 69.28 },
    ratingAverage: 4,
    workingHours: '09:00 - 18:00',
  });
  const far = barber('Far', {
    location: { latitude: 41.4, longitude: 69.4 },
    ratingAverage: 5,
    services: [{ id: 's', barberId: 'Far', name: 'Soqol olish', price: 1 }],
    workingHours: '20:00 - 23:00',
  });
  const unknown = barber('Unknown');
  const all = [unknown, far, near];
  const names = (list: ApiBarberFull[]) => list.map((b) => b.id);
  const user = { latitude: 41.31, longitude: 69.28 };

  it('lists everyone and searches names and services', () => {
    expect(names(listBarbers(all, {}))).toEqual(['Unknown', 'Far', 'Near']);
    expect(names(listBarbers(all, { query: 'near' }))).toEqual(['Near']);
    expect(names(listBarbers(all, { query: 'soqol' }))).toEqual(['Far']);
  });

  it('filters and sorts', () => {
    expect(names(listBarbers(all, { filter: 'rating' }))).toEqual(['Far', 'Near', 'Unknown']);
    expect(names(listBarbers(all, { filter: 'distance', user }))).toEqual([
      'Near',
      'Far',
      'Unknown',
    ]);
    expect(names(listBarbers(all, { filter: 'open', now: tashkent(10) }))).toEqual(['Near']);
    expect(names(listBarbers(all, { filter: 'beard' }))).toEqual(['Far']);
  });
});

describe('next visit on the home screen', () => {
  const item = (id: string, timestamp: string, status = 'confirmed') =>
    ({ id, timestamp, status, barber_id: 'b' }) as ClientBooking;
  const now = Date.parse('2026-11-27T10:00:00Z');

  it('is the soonest one still ahead', () => {
    const items = [
      item('later', '2026-11-29T10:00:00Z'),
      item('past', '2026-11-26T10:00:00Z'),
      item('soon', '2026-11-28T10:00:00Z', 'pending_confirmation'),
      item('off', '2026-11-27T11:00:00Z', 'cancelled'),
    ];
    expect(nextBooking(items, now)?.id).toBe('soon');
    expect(nextBooking([], now)).toBeNull();
  });
});
